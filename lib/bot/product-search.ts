import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { paginationMeta } from '@/lib/api-utils'
import { searchProductIdsInMeilisearch } from '@/lib/utils/meilisearch-sync'
import { resolveProductDisplayName } from '@/lib/utils/product-display-name'
import { BotServiceError } from './errors'
import {
    looksLikeSingleSkuToken,
    normalizeItemNumberForSearch,
    normalizeSearchQuery,
} from './normalize-search-query'
import {
    getParseDictionary,
    parseProductQueryText,
    resolveAttrOriginals,
    resolveBrandOriginals,
    type ParseDictionary,
    type ParsedProductQuery,
} from './parse-product-query'

const availableQueryParam = z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    if (val === true || val === 'true' || val === '1') return true
    if (val === false || val === 'false' || val === '0') return false
    return val
}, z.boolean().optional())

const parseQueryParam = z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return true
    if (val === true || val === 'true' || val === '1') return true
    if (val === false || val === 'false' || val === '0') return false
    return val
}, z.boolean())

export const ProductSearchQuerySchema = z.object({
    q: z.string().trim().min(1, 'يجب تمرير معامل البحث q'),
    brand: z.string().trim().min(1).optional(),
    /** Repeated query params: ?attr=أحمر&attr=L — AND between values */
    attr: z.array(z.string().trim().min(1)).default([]),
    available: availableQueryParam,
    /** When false, skip high-confidence parse of q into brand/attr */
    parse: parseQueryParam.default(true),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>

export type SearchEngine = 'meili' | 'prisma'

export interface ProductSearchSibling {
    id: string
    itemNumber: string
    name: string
    displayName: string
    isAvailable: boolean
    attributes: Array<{ code: string; name: string; value: string }>
}

export interface ProductSearchResult {
    id: string
    itemNumber: string
    /** Stored product name (always Product.name) */
    name: string
    /** Resolved display name (family name when inheriting) */
    displayName: string
    isAvailable: boolean
    familyId: string | null
    family: { id: string; code: string; name: string } | null
    brand: { id: string; name: string } | null
    category: { id: string; name: string }
    attributes: Array<{ code: string; name: string; value: string }>
    /** Other products in the same family (empty when no family) */
    siblings: ProductSearchSibling[]
}

export interface ProductSearchParsedMeta {
    brand?: string
    attr: string[]
    residualQ: string
    relaxed?: boolean
}

export interface ProductSearchMeta {
    count: number
    pagination: ReturnType<typeof paginationMeta>
    engine: SearchEngine
    parsed?: ProductSearchParsedMeta
}

const productSelect = {
    id: true,
    itemNumber: true,
    name: true,
    isAvailable: true,
    familyId: true,
    inheritsFamilyName: true,
    family: { select: { id: true, code: true, name: true } },
    brandRef: { select: { id: true, name: true } },
    category: { select: { id: true, name: true } },
    productAttributes: {
        select: {
            value: true,
            attribute: { select: { code: true, name: true } },
        },
        orderBy: { attribute: { name: 'asc' as const } },
    },
} satisfies Prisma.ProductSelect

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>

function mapProduct(p: ProductRow): ProductSearchResult {
    const family = p.family
        ? { id: p.family.id, code: p.family.code, name: p.family.name }
        : null
    const displayName = resolveProductDisplayName({
        name: p.name,
        inheritsFamilyName: p.inheritsFamilyName,
        family,
    })
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        displayName,
        isAvailable: p.isAvailable,
        familyId: p.familyId ?? null,
        family,
        brand: p.brandRef ? { id: p.brandRef.id, name: p.brandRef.name } : null,
        category: { id: p.category.id, name: p.category.name },
        attributes: p.productAttributes.map(pa => ({
            code: pa.attribute.code,
            name: pa.attribute.name,
            value: pa.value,
        })),
        siblings: [],
    }
}

function toSibling(p: ProductSearchResult): ProductSearchSibling {
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        displayName: p.displayName,
        isAvailable: p.isAvailable,
        attributes: p.attributes,
    }
}

async function attachSiblings(
    results: ProductSearchResult[]
): Promise<ProductSearchResult[]> {
    const familyIds = [
        ...new Set(results.map(r => r.familyId).filter((id): id is string => Boolean(id))),
    ]
    if (familyIds.length === 0) return results

    const rows = await prisma.product.findMany({
        where: { familyId: { in: familyIds } },
        select: productSelect,
    })
    const byFamily = new Map<string, ProductSearchResult[]>()
    for (const row of rows) {
        const mapped = mapProduct(row)
        if (!mapped.familyId) continue
        const list = byFamily.get(mapped.familyId) ?? []
        list.push(mapped)
        byFamily.set(mapped.familyId, list)
    }

    return results.map(r => {
        if (!r.familyId) return r
        const all = byFamily.get(r.familyId) ?? []
        return {
            ...r,
            siblings: all.filter(s => s.id !== r.id).map(toSibling),
        }
    })
}

async function withSiblings(result: {
    results: ProductSearchResult[]
    meta: ProductSearchMeta
}): Promise<{ results: ProductSearchResult[]; meta: ProductSearchMeta }> {
    return {
        ...result,
        results: await attachSiblings(result.results),
    }
}

/** Normalize q / brand / attr for Meili filters and Prisma fallback. */
function prepareSearchQuery(query: ProductSearchQuery): ProductSearchQuery {
    const q = normalizeSearchQuery(query.q)
    return {
        ...query,
        q: q || query.q.trim(),
        brand: query.brand ? normalizeSearchQuery(query.brand) || undefined : undefined,
        attr: query.attr
            .map(v => normalizeSearchQuery(v))
            .filter((v): v is string => Boolean(v)),
    }
}

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLikePattern(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Product IDs whose alternativeNames match q.
 * Some rows store a JSON array; others may be a scalar string — guard typeof
 * so jsonb_array_elements_text never runs on non-arrays.
 */
async function findIdsByAlternativeName(q: string): Promise<string[]> {
    const pattern = `%${escapeLikePattern(q)}%`
    const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id
        FROM "Product" p
        WHERE p."alternativeNames" IS NOT NULL
          AND (
              (
                  jsonb_typeof(p."alternativeNames") = 'array'
                  AND EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements_text(p."alternativeNames") AS alt
                      WHERE alt ILIKE ${pattern} ESCAPE '\\'
                  )
              )
              OR (
                  jsonb_typeof(p."alternativeNames") = 'string'
                  AND (p."alternativeNames" #>> '{}') ILIKE ${pattern} ESCAPE '\\'
              )
              OR (
                  jsonb_typeof(p."alternativeNames") NOT IN ('array', 'string')
                  AND p."alternativeNames"::text ILIKE ${pattern} ESCAPE '\\'
              )
          )
    `
    return rows.map(r => r.id)
}

/** Parse search query params; throws BotServiceError on validation failure. */
export function parseProductSearchQuery(searchParams: URLSearchParams) {
    const parsed = ProductSearchQuerySchema.safeParse({
        q: searchParams.get('q') ?? undefined,
        brand: searchParams.get('brand') ?? undefined,
        attr: searchParams.getAll('attr').map(v => v.trim()).filter(Boolean),
        available: searchParams.get('available') ?? undefined,
        parse: searchParams.get('parse') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success) {
        throw new BotServiceError(
            'البيانات غير صالحة',
            400,
            'VALIDATION_ERROR',
            parsed.error.flatten()
        )
    }
    return parsed.data
}

function availabilityFilter(
    available: boolean | undefined
): Prisma.ProductWhereInput[] {
    if (available === undefined) return []
    return [{ isAvailable: available }]
}

/**
 * Soft filters for Prisma exact-SKU pin: compare normalized brand/attr
 * against DB values so hamza/taa differences still match.
 */
function matchesPreparedFilters(row: ProductRow, query: ProductSearchQuery): boolean {
    if (query.available !== undefined && row.isAvailable !== query.available) {
        return false
    }
    if (query.brand) {
        const brandName = row.brandRef?.name
            ? normalizeSearchQuery(row.brandRef.name)
            : ''
        if (brandName !== query.brand) return false
    }
    for (const value of query.attr) {
        const hit = row.productAttributes.some(
            pa => normalizeSearchQuery(pa.value) === value
        )
        if (!hit) return false
    }
    return true
}

async function findExactByItemNumber(
    q: string,
    query: ProductSearchQuery
): Promise<ProductRow | null> {
    const skuNorm = normalizeItemNumberForSearch(q)
    const candidates = [
        ...new Set(
            [q.trim(), skuNorm, normalizeSearchQuery(q)].filter(Boolean)
        ),
    ]

    let row = await prisma.product.findFirst({
        where: {
            itemNumber: { in: candidates },
            ...(query.available !== undefined
                ? { isAvailable: query.available }
                : {}),
        },
        select: productSelect,
    })

    if (!row && skuNorm) {
        const ids = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id
            FROM "Product"
            WHERE regexp_replace("itemNumber", '[\\s\\-_]+', '', 'g') ILIKE ${skuNorm}
            LIMIT 5
        `
        if (ids.length > 0) {
            const rows = await prisma.product.findMany({
                where: {
                    id: { in: ids.map(r => r.id) },
                    ...(query.available !== undefined
                        ? { isAvailable: query.available }
                        : {}),
                },
                select: productSelect,
            })
            row =
                rows.find(r => matchesPreparedFilters(r, query)) ??
                rows[0] ??
                null
            if (row && !matchesPreparedFilters(row, query)) row = null
            return row
        }
    }

    if (!row) return null
    return matchesPreparedFilters(row, query) ? row : null
}

/**
 * Exact brand/attr filters (aligned with Meili) using dictionary originals
 * so Arabic normalization still matches DB values.
 */
function buildExactAndFilters(
    query: ProductSearchQuery,
    dict: ParseDictionary
): Prisma.ProductWhereInput[] {
    const filters: Prisma.ProductWhereInput[] = [
        ...availabilityFilter(query.available),
    ]
    if (query.brand) {
        const originals = resolveBrandOriginals(query.brand, dict)
        filters.push({
            brandRef: {
                OR: originals.map(name => ({
                    name: { equals: name, mode: 'insensitive' as const },
                })),
            },
        })
    }
    for (const value of query.attr) {
        const originals = resolveAttrOriginals(value, dict)
        filters.push({
            productAttributes: {
                some: {
                    OR: originals.map(v => ({
                        value: { equals: v, mode: 'insensitive' as const },
                    })),
                },
            },
        })
    }
    return filters
}

async function hydrateProductsInOrder(ids: string[]): Promise<ProductSearchResult[]> {
    if (ids.length === 0) return []
    const rows = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: productSelect,
    })
    const byId = new Map(rows.map(r => [r.id, r]))
    return ids
        .map(id => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => p != null)
        .map(mapProduct)
}

function buildParsedMeta(
    parsed: ParsedProductQuery | null,
    relaxed?: boolean
): ProductSearchParsedMeta | undefined {
    if (!parsed) return undefined
    return {
        brand: parsed.brand,
        attr: parsed.attr,
        residualQ: parsed.residualQ,
        ...(relaxed ? { relaxed: true } : {}),
    }
}

function withMeta(
    result: {
        results: ProductSearchResult[]
        meta: { count: number; pagination: ReturnType<typeof paginationMeta> }
    },
    engine: SearchEngine,
    parsedMeta?: ProductSearchParsedMeta
): { results: ProductSearchResult[]; meta: ProductSearchMeta } {
    return {
        results: result.results,
        meta: {
            ...result.meta,
            engine,
            ...(parsedMeta ? { parsed: parsedMeta } : {}),
        },
    }
}

type ResolvedSearch = {
    prepared: ProductSearchQuery
    searchQ: string
    filterQuery: ProductSearchQuery
    parsed: ParsedProductQuery | null
    extractedApplied: boolean
    dict: ParseDictionary
}

async function resolveSearchContext(
    query: ProductSearchQuery
): Promise<ResolvedSearch> {
    const prepared = prepareSearchQuery(query)
    const dict = await getParseDictionary()

    let parsed: ParsedProductQuery | null = null
    let searchQ = prepared.q
    let filterQuery: ProductSearchQuery = { ...prepared }
    let extractedApplied = false

    if (prepared.parse) {
        parsed = parseProductQueryText(prepared.q, dict, {
            explicitBrand: prepared.brand,
            explicitAttr: prepared.attr,
        })
        // Prefer residual; if parse removed everything, keep original q for text search
        // unless we extracted filters (then filter-only / empty Meili q is OK).
        const hasExtracted =
            Boolean(parsed.extractedBrand) || parsed.extractedAttr.length > 0
        searchQ = hasExtracted
            ? parsed.residualQ
            : parsed.residualQ || prepared.q
        filterQuery = {
            ...prepared,
            brand: parsed.brand,
            attr: parsed.attr,
            q: searchQ || prepared.q,
        }
        extractedApplied = hasExtracted
    }

    return { prepared, searchQ, filterQuery, parsed, extractedApplied, dict }
}

function skuFastPathResult(
    row: ProductRow,
    parsedMeta?: ProductSearchParsedMeta
) {
    return withMeta(
        {
            results: [mapProduct(row)],
            meta: {
                count: 1,
                pagination: paginationMeta(1, 1, 1),
            },
        },
        'prisma',
        parsedMeta
    )
}

/** Prisma ILIKE search — used only when Meilisearch is unavailable. */
export async function searchProductsPrisma(
    query: ProductSearchQuery,
    ctx?: ResolvedSearch,
    relaxed = false
) {
    const resolved = ctx ?? (await resolveSearchContext(query))
    const { searchQ, filterQuery, parsed, extractedApplied, dict } = resolved
    const q = searchQ
    const { page, limit } = filterQuery
    const offset = (page - 1) * limit
    const andFilters = buildExactAndFilters(filterQuery, dict)

    const [exact, altIds] = await Promise.all([
        q
            ? findExactByItemNumber(q, filterQuery)
            : Promise.resolve(null),
        q ? findIdsByAlternativeName(q) : Promise.resolve([] as string[]),
    ])

    const textOr: Prisma.ProductWhereInput[] = q
        ? [
              { name: { contains: q, mode: 'insensitive' } },
              { itemNumber: { contains: q, mode: 'insensitive' } },
              {
                  brandRef: {
                      name: { contains: q, mode: 'insensitive' },
                  },
              },
              {
                  family: {
                      name: { contains: q, mode: 'insensitive' },
                  },
              },
              {
                  productAttributes: {
                      some: {
                          OR: [
                              {
                                  value: {
                                      contains: q,
                                      mode: 'insensitive',
                                  },
                              },
                              {
                                  attribute: {
                                      name: {
                                          contains: q,
                                          mode: 'insensitive',
                                      },
                                  },
                              },
                              {
                                  attribute: {
                                      code: {
                                          contains: q,
                                          mode: 'insensitive',
                                      },
                                  },
                              },
                          ],
                      },
                  },
              },
              ...(altIds.length > 0 ? [{ id: { in: altIds } }] : []),
          ]
        : []

    const fuzzyWhere: Prisma.ProductWhereInput = {
        AND: [
            ...(textOr.length > 0 ? [{ OR: textOr }] : []),
            ...andFilters,
            ...(exact ? [{ id: { not: exact.id } }] : []),
        ],
    }

    const exactBonus = exact ? 1 : 0
    const fuzzyTotal = await prisma.product.count({ where: fuzzyWhere })
    const total = fuzzyTotal + exactBonus

    const parsedMeta = buildParsedMeta(parsed, relaxed)

    if (total === 0 && extractedApplied && !relaxed) {
        const withoutExtracted: ResolvedSearch = {
            prepared: { ...resolved.prepared, parse: false },
            searchQ: resolved.prepared.q,
            filterQuery: {
                ...resolved.prepared,
                brand: resolved.prepared.brand,
                attr: resolved.prepared.attr,
                parse: false,
                q: resolved.prepared.q,
            },
            parsed: resolved.parsed,
            extractedApplied: false,
            dict: resolved.dict,
        }
        return searchProductsPrisma(query, withoutExtracted, true)
    }

    if (page === 1 && exact) {
        const take = Math.max(0, limit - 1)
        const rest =
            take > 0
                ? await prisma.product.findMany({
                      where: fuzzyWhere,
                      select: productSelect,
                      orderBy: { name: 'asc' },
                      take,
                      skip: 0,
                  })
                : []

        return withMeta(
            {
                results: [mapProduct(exact), ...rest.map(mapProduct)],
                meta: {
                    count: 1 + rest.length,
                    pagination: paginationMeta(total, page, limit),
                },
            },
            'prisma',
            parsedMeta
        )
    }

    const skip = exact ? Math.max(0, offset - 1) : offset
    const rows = await prisma.product.findMany({
        where: fuzzyWhere,
        select: productSelect,
        orderBy: { name: 'asc' },
        take: limit,
        skip,
    })

    return withMeta(
        {
            results: rows.map(mapProduct),
            meta: {
                count: rows.length,
                pagination: paginationMeta(total, page, limit),
            },
        },
        'prisma',
        parsedMeta
    )
}

async function hydrateWithRefill(
    ids: string[],
    searchQ: string,
    filterQuery: ProductSearchQuery,
    needed: number,
    meiliOffset: number,
    excludeId?: string
): Promise<ProductSearchResult[]> {
    let results = await hydrateProductsInOrder(ids)
    if (results.length >= needed || ids.length === 0) {
        return results.slice(0, needed)
    }

    const missing = needed - results.length
    const refill = await searchProductIdsInMeilisearch(searchQ, {
        limit: missing + ids.length,
        offset: meiliOffset + ids.length,
        brand: filterQuery.brand,
        attributeValues:
            filterQuery.attr.length > 0 ? filterQuery.attr : undefined,
        isAvailable: filterQuery.available,
        excludeId,
    })
    if (refill.unavailable || refill.ids.length === 0) {
        return results
    }

    const seen = new Set(results.map(r => r.id))
    const extraIds = refill.ids.filter(id => !seen.has(id))
    const extra = await hydrateProductsInOrder(extraIds)
    results = [...results, ...extra]
    return results.slice(0, needed)
}

async function searchProductsMeili(
    query: ProductSearchQuery,
    ctx?: ResolvedSearch,
    relaxed = false
) {
    const resolved = ctx ?? (await resolveSearchContext(query))
    const { searchQ, filterQuery, parsed, extractedApplied } = resolved
    const { page, limit } = filterQuery
    const offset = (page - 1) * limit

    const exact = await findExactByItemNumber(searchQ, filterQuery)

    const exactBonus = exact ? 1 : 0
    const meiliLimit = page === 1 && exact ? Math.max(0, limit - 1) : limit
    const meiliOffset =
        exact && page > 1
            ? Math.max(0, offset - 1)
            : page === 1 && exact
              ? 0
              : offset

    const meili = await searchProductIdsInMeilisearch(searchQ, {
        limit: meiliLimit,
        offset: meiliOffset,
        brand: filterQuery.brand,
        attributeValues:
            filterQuery.attr.length > 0 ? filterQuery.attr : undefined,
        isAvailable: filterQuery.available,
        excludeId: exact?.id,
    })

    if (meili.unavailable) {
        return null
    }

    const parsedMeta = buildParsedMeta(parsed, relaxed)

    if (
        meili.ids.length === 0 &&
        !exact &&
        extractedApplied &&
        !relaxed
    ) {
        const withoutExtracted: ResolvedSearch = {
            prepared: { ...resolved.prepared, parse: false },
            searchQ: resolved.prepared.q,
            filterQuery: {
                ...resolved.prepared,
                brand: resolved.prepared.brand,
                attr: resolved.prepared.attr,
                parse: false,
                q: resolved.prepared.q,
            },
            parsed: resolved.parsed,
            extractedApplied: false,
            dict: resolved.dict,
        }
        return searchProductsMeili(query, withoutExtracted, true)
    }

    const needed = page === 1 && exact ? Math.max(0, limit - 1) : limit
    const rest = await hydrateWithRefill(
        meili.ids,
        searchQ,
        filterQuery,
        needed,
        meiliOffset,
        exact?.id
    )

    const total = meili.estimatedTotal + exactBonus
    const results =
        page === 1 && exact ? [mapProduct(exact), ...rest] : rest

    return withMeta(
        {
            results,
            meta: {
                count: results.length,
                pagination: paginationMeta(total, page, limit),
            },
        },
        'meili',
        parsedMeta
    )
}

/**
 * Bot product search: Meilisearch (fuzzy + full-text) with Prisma hydrate.
 * Falls back to Prisma ILIKE when Meili is unavailable.
 */
export async function searchProducts(query: ProductSearchQuery) {
    const prepared = prepareSearchQuery(query)

    // Fast path: single SKU token → return immediately without Meili
    if (looksLikeSingleSkuToken(query.q)) {
        const exact = await findExactByItemNumber(query.q, {
            ...prepared,
            brand: prepared.brand,
            attr: prepared.attr,
        })
        if (exact) {
            return withSiblings(
                skuFastPathResult(exact, {
                    attr: prepared.attr,
                    residualQ: prepared.q,
                    brand: prepared.brand,
                })
            )
        }
    }

    const ctx = await resolveSearchContext(query)
    const meiliResult = await searchProductsMeili(query, ctx)
    if (meiliResult) return withSiblings(meiliResult)
    return withSiblings(await searchProductsPrisma(query, ctx))
}
