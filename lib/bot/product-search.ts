import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { paginationMeta } from '@/lib/api-utils'
import { searchProductIdsInMeilisearch } from '@/lib/utils/meilisearch-sync'
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

const FAMILY_FETCH_MULTIPLIER = 5
const FAMILY_FETCH_CAP = 100
/** Safety cap on how many product hits to scan while filling a family page */
const FAMILY_SCAN_PRODUCT_CAP = 300

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
    /** Optional ProductFamily.code filter */
    familyCode: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>

export type SearchEngine = 'meili' | 'prisma'

/** Matched product inside a family group */
export interface ProductSearchProduct {
    id: string
    itemNumber: string
    name: string
    displayName: string
    isAvailable: boolean
    attributes: Array<{ code: string; name: string; value: string }>
}

/** One search hit grouped by ProductFamily (matched products only) */
export interface ProductSearchFamilyGroup {
    family: { id: string; code: string; name: string }
    category: { id: string; name: string }
    brand: { id: string; name: string } | null
    matchCount: number
    products: ProductSearchProduct[]
}

/** @deprecated Use ProductSearchFamilyGroup — kept alias during transition */
export type ProductSearchResult = ProductSearchFamilyGroup

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
    hasMore: boolean
    skuMatch?: boolean
    parsed?: ProductSearchParsedMeta
}

/** Internal flat product row before family grouping */
interface MappedProduct {
    id: string
    itemNumber: string
    name: string
    displayName: string
    isAvailable: boolean
    familyId: string
    family: { id: string; code: string; name: string }
    brand: { id: string; name: string } | null
    category: { id: string; name: string }
    attributes: Array<{ code: string; name: string; value: string }>
}

const productSelect = {
    id: true,
    itemNumber: true,
    name: true,
    isAvailable: true,
    familyId: true,
    family: {
        select: {
            id: true,
            code: true,
            name: true,
            category: { select: { id: true, name: true } },
        },
    },
    brandRef: { select: { id: true, name: true } },
    productAttributes: {
        select: {
            value: true,
            attribute: { select: { code: true, name: true } },
        },
        orderBy: { attribute: { name: 'asc' as const } },
    },
} satisfies Prisma.ProductSelect

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>

function mapProduct(p: ProductRow): MappedProduct {
    const category = p.family.category
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        displayName: p.name,
        isAvailable: p.isAvailable,
        familyId: p.familyId,
        family: { id: p.family.id, code: p.family.code, name: p.family.name },
        brand: p.brandRef ? { id: p.brandRef.id, name: p.brandRef.name } : null,
        category: { id: category.id, name: category.name },
        attributes: p.productAttributes.map(pa => ({
            code: pa.attribute.code,
            name: pa.attribute.name,
            value: pa.value,
        })),
    }
}

function toSearchProduct(p: MappedProduct): ProductSearchProduct {
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        displayName: p.displayName,
        isAvailable: p.isAvailable,
        attributes: p.attributes,
    }
}

/** Group flat matched products by familyId, preserving first-seen family order. */
export function groupProductsIntoFamilies(
    products: MappedProduct[]
): ProductSearchFamilyGroup[] {
    const order: string[] = []
    const buckets = new Map<string, MappedProduct[]>()

    for (const p of products) {
        let list = buckets.get(p.familyId)
        if (!list) {
            list = []
            buckets.set(p.familyId, list)
            order.push(p.familyId)
        }
        if (!list.some(x => x.id === p.id)) {
            list.push(p)
        }
    }

    return order.map(familyId => {
        const list = buckets.get(familyId)!
        const first = list[0]
        return {
            family: first.family,
            category: first.category,
            brand: first.brand,
            matchCount: list.length,
            products: list.map(toSearchProduct),
        }
    })
}

function internalFetchLimit(pageLimit: number): number {
    return Math.min(pageLimit * FAMILY_FETCH_MULTIPLIER, FAMILY_FETCH_CAP)
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
        familyCode: query.familyCode?.trim() || undefined,
    }
}

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLikePattern(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

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
        familyCode: searchParams.get('familyCode') ?? undefined,
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

function matchesPreparedFilters(
    row: ProductRow,
    query: ProductSearchQuery,
    familyId?: string | null
): boolean {
    if (familyId && row.familyId !== familyId) return false
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
    query: ProductSearchQuery,
    familyId?: string | null
): Promise<ProductRow | null> {
    const skuNorm = normalizeItemNumberForSearch(q)
    const candidates = [
        ...new Set(
            [q.trim(), skuNorm, normalizeSearchQuery(q)].filter(Boolean)
        ),
    ]

    const familyWhere = familyId ? { familyId } : {}

    let row = await prisma.product.findFirst({
        where: {
            itemNumber: { in: candidates },
            ...familyWhere,
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
                    ...familyWhere,
                    ...(query.available !== undefined
                        ? { isAvailable: query.available }
                        : {}),
                },
                select: productSelect,
            })
            row =
                rows.find(r => matchesPreparedFilters(r, query, familyId)) ??
                null
            return row
        }
    }

    if (!row) return null
    return matchesPreparedFilters(row, query, familyId) ? row : null
}

function buildExactAndFilters(
    query: ProductSearchQuery,
    dict: ParseDictionary,
    familyId?: string | null
): Prisma.ProductWhereInput[] {
    const filters: Prisma.ProductWhereInput[] = [
        ...availabilityFilter(query.available),
    ]
    if (familyId) {
        filters.push({ familyId })
    }
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

async function hydrateProductsInOrder(ids: string[]): Promise<MappedProduct[]> {
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
    groups: ProductSearchFamilyGroup[],
    opts: {
        engine: SearchEngine
        page: number
        limit: number
        estimatedFamilyTotal: number
        hasMore: boolean
        skuMatch?: boolean
        parsedMeta?: ProductSearchParsedMeta
    }
): { results: ProductSearchFamilyGroup[]; meta: ProductSearchMeta } {
    const total = Math.max(
        opts.estimatedFamilyTotal,
        (opts.page - 1) * opts.limit + groups.length
    )
    return {
        results: groups,
        meta: {
            count: groups.length,
            pagination: paginationMeta(total, opts.page, opts.limit),
            engine: opts.engine,
            hasMore: opts.hasMore,
            ...(opts.skuMatch ? { skuMatch: true } : {}),
            ...(opts.parsedMeta ? { parsed: opts.parsedMeta } : {}),
        },
    }
}

function emptyResult(
    engine: SearchEngine,
    page: number,
    limit: number,
    parsedMeta?: ProductSearchParsedMeta
) {
    return withMeta([], {
        engine,
        page,
        limit,
        estimatedFamilyTotal: 0,
        hasMore: false,
        parsedMeta,
    })
}

/** Resolve familyCode → id; null means not found (caller returns empty). */
async function resolveFamilyIdByCode(
    familyCode: string | undefined
): Promise<string | null | undefined> {
    if (!familyCode) return undefined
    const family = await prisma.productFamily.findUnique({
        where: { code: familyCode },
        select: { id: true },
    })
    return family?.id ?? null
}

type ResolvedSearch = {
    prepared: ProductSearchQuery
    searchQ: string
    filterQuery: ProductSearchQuery
    parsed: ParsedProductQuery | null
    extractedApplied: boolean
    dict: ParseDictionary
    /** undefined = no filter; null = code not found */
    familyId: string | null | undefined
}

async function resolveSearchContext(
    query: ProductSearchQuery
): Promise<ResolvedSearch> {
    const prepared = prepareSearchQuery(query)
    const [dict, familyId] = await Promise.all([
        getParseDictionary(),
        resolveFamilyIdByCode(prepared.familyCode),
    ])

    let parsed: ParsedProductQuery | null = null
    let searchQ = prepared.q
    let filterQuery: ProductSearchQuery = { ...prepared }
    let extractedApplied = false

    if (prepared.parse) {
        parsed = parseProductQueryText(prepared.q, dict, {
            explicitBrand: prepared.brand,
            explicitAttr: prepared.attr,
        })
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

    return {
        prepared,
        searchQ,
        filterQuery,
        parsed,
        extractedApplied,
        dict,
        familyId,
    }
}

function ingestMappedIntoFamilies(
    products: MappedProduct[],
    familyOrder: string[],
    buckets: Map<string, MappedProduct[]>,
    familyIdFilter?: string | null
) {
    for (const p of products) {
        if (familyIdFilter && p.familyId !== familyIdFilter) continue
        let list = buckets.get(p.familyId)
        if (!list) {
            list = []
            buckets.set(p.familyId, list)
            familyOrder.push(p.familyId)
        }
        if (!list.some(x => x.id === p.id)) {
            list.push(p)
        }
    }
}

function sliceFamilyPage(
    familyOrder: string[],
    buckets: Map<string, MappedProduct[]>,
    page: number,
    limit: number
): {
    groups: ProductSearchFamilyGroup[]
    hasMoreFromBuffer: boolean
} {
    const skip = (page - 1) * limit
    const sliceIds = familyOrder.slice(skip, skip + limit)
    const groups = sliceIds.map(id => {
        const list = buckets.get(id)!
        return {
            family: list[0].family,
            category: list[0].category,
            brand: list[0].brand,
            matchCount: list.length,
            products: list.map(toSearchProduct),
        }
    })
    return {
        groups,
        hasMoreFromBuffer: familyOrder.length > skip + limit,
    }
}

/** Prisma ILIKE search — used only when Meilisearch is unavailable. */
export async function searchProductsPrisma(
    query: ProductSearchQuery,
    ctx?: ResolvedSearch,
    relaxed = false
) {
    const resolved = ctx ?? (await resolveSearchContext(query))
    const { searchQ, filterQuery, parsed, extractedApplied, dict, familyId } =
        resolved
    const { page, limit } = filterQuery
    const parsedMeta = buildParsedMeta(parsed, relaxed)

    if (familyId === null) {
        return emptyResult('prisma', page, limit, parsedMeta)
    }

    const q = searchQ
    const andFilters = buildExactAndFilters(filterQuery, dict, familyId)

    const [exact, altIds] = await Promise.all([
        q
            ? findExactByItemNumber(q, filterQuery, familyId)
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

    const fuzzyTotal = await prisma.product.count({ where: fuzzyWhere })
    const productTotal = fuzzyTotal + (exact ? 1 : 0)

    if (productTotal === 0 && extractedApplied && !relaxed) {
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
            familyId: resolved.familyId,
        }
        return searchProductsPrisma(query, withoutExtracted, true)
    }

    const needFamilies = (page - 1) * limit + limit + 1
    const take = Math.min(
        Math.max(needFamilies * FAMILY_FETCH_MULTIPLIER, internalFetchLimit(limit)),
        FAMILY_SCAN_PRODUCT_CAP
    )

    const mapped: MappedProduct[] = []
    if (exact) {
        mapped.push(mapProduct(exact))
    }
    const rows = await prisma.product.findMany({
        where: fuzzyWhere,
        select: productSelect,
        orderBy: { name: 'asc' },
        take,
        skip: 0,
    })
    for (const row of rows) {
        mapped.push(mapProduct(row))
    }

    const familyOrder: string[] = []
    const buckets = new Map<string, MappedProduct[]>()
    ingestMappedIntoFamilies(mapped, familyOrder, buckets, familyId)

    const { groups, hasMoreFromBuffer } = sliceFamilyPage(
        familyOrder,
        buckets,
        page,
        limit
    )
    const hasMore =
        hasMoreFromBuffer ||
        mapped.length >= take ||
        productTotal > mapped.length

    // Rough family total estimate from product hits
    const estimatedFamilyTotal = Math.max(
        familyOrder.length,
        Math.ceil(productTotal / 2)
    )

    return withMeta(groups, {
        engine: 'prisma',
        page,
        limit,
        estimatedFamilyTotal,
        hasMore,
        parsedMeta,
    })
}

async function searchProductsMeili(
    query: ProductSearchQuery,
    ctx?: ResolvedSearch,
    relaxed = false
) {
    const resolved = ctx ?? (await resolveSearchContext(query))
    const { searchQ, filterQuery, parsed, extractedApplied, familyId } =
        resolved
    const { page, limit } = filterQuery
    const parsedMeta = buildParsedMeta(parsed, relaxed)

    if (familyId === null) {
        return emptyResult('meili', page, limit, parsedMeta)
    }

    const needFamilies = (page - 1) * limit + limit + 1
    const batchSize = internalFetchLimit(limit)
    const familyOrder: string[] = []
    const buckets = new Map<string, MappedProduct[]>()

    let offset = 0
    let estimatedProductTotal = 0
    let exhausted = false
    let scanned = 0

    while (familyOrder.length < needFamilies && !exhausted) {
        const meili = await searchProductIdsInMeilisearch(searchQ, {
            limit: batchSize,
            offset,
            brand: filterQuery.brand,
            attributeValues:
                filterQuery.attr.length > 0 ? filterQuery.attr : undefined,
            isAvailable: filterQuery.available,
            familyId: familyId ?? undefined,
        })

        if (meili.unavailable) {
            return null
        }

        estimatedProductTotal = meili.estimatedTotal

        if (meili.ids.length === 0) {
            exhausted = true
            break
        }

        const products = await hydrateProductsInOrder(meili.ids)
        ingestMappedIntoFamilies(products, familyOrder, buckets, familyId)

        offset += meili.ids.length
        scanned += meili.ids.length
        if (meili.ids.length < batchSize) {
            exhausted = true
        }
        if (scanned >= FAMILY_SCAN_PRODUCT_CAP) {
            break
        }
    }

    if (
        familyOrder.length === 0 &&
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
            familyId: resolved.familyId,
        }
        return searchProductsMeili(query, withoutExtracted, true)
    }

    const { groups, hasMoreFromBuffer } = sliceFamilyPage(
        familyOrder,
        buckets,
        page,
        limit
    )
    const hasMore =
        hasMoreFromBuffer ||
        (!exhausted && estimatedProductTotal > scanned) ||
        scanned >= FAMILY_SCAN_PRODUCT_CAP

    const estimatedFamilyTotal = Math.max(
        (page - 1) * limit + groups.length + (hasMore ? 1 : 0),
        Math.ceil(estimatedProductTotal / 2)
    )

    return withMeta(groups, {
        engine: 'meili',
        page,
        limit,
        estimatedFamilyTotal,
        hasMore,
        parsedMeta,
    })
}

function skuFamilyResult(
    row: ProductRow,
    parsedMeta?: ProductSearchParsedMeta
) {
    const groups = groupProductsIntoFamilies([mapProduct(row)])
    return withMeta(groups, {
        engine: 'prisma',
        page: 1,
        limit: 1,
        estimatedFamilyTotal: 1,
        hasMore: false,
        skuMatch: true,
        parsedMeta,
    })
}

/**
 * Bot product search: Meilisearch (fuzzy + full-text) with Prisma hydrate,
 * results grouped by ProductFamily (matched products only).
 */
export async function searchProducts(query: ProductSearchQuery) {
    const prepared = prepareSearchQuery(query)
    const familyId = await resolveFamilyIdByCode(prepared.familyCode)

    if (familyId === null) {
        return emptyResult('prisma', prepared.page, prepared.limit)
    }

    // Fast path: single SKU token → one family group
    if (looksLikeSingleSkuToken(query.q)) {
        const exact = await findExactByItemNumber(
            query.q,
            {
                ...prepared,
                brand: prepared.brand,
                attr: prepared.attr,
            },
            familyId
        )
        if (exact) {
            return skuFamilyResult(exact, {
                attr: prepared.attr,
                residualQ: prepared.q,
                brand: prepared.brand,
            })
        }
    }

    const ctx = await resolveSearchContext(query)
    const meiliResult = await searchProductsMeili(query, ctx)
    if (meiliResult) return meiliResult
    return searchProductsPrisma(query, ctx)
}
