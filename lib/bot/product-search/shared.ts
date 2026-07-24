import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { paginationMeta } from '@/lib/api-utils'
import { normalizeSearchQuery } from '../normalize-search-query'
import { findItemIdByItemNumber } from '../resolve-item-number'
import {
    getParseDictionary,
    parseProductQueryText,
    resolveAttrOriginals,
    resolveBrandOriginals,
    type ParseDictionary,
    type ParsedProductQuery,
} from '../parse-product-query'
import type { ProductSearchQuery } from './schema'
import type {
    ProductSearchGroup,
    ProductSearchMeta,
    ProductSearchParsedMeta,
    SearchEngine,
} from './types'
import { itemSelect, type ItemRow } from './hydrate'

export const FAMILY_FETCH_MULTIPLIER = 5
export const FAMILY_FETCH_CAP = 100
/** Safety cap on how many item hits to scan while filling a product (SPU) page */
export const FAMILY_SCAN_PRODUCT_CAP = 300

export function internalFetchLimit(pageLimit: number): number {
    return Math.min(pageLimit * FAMILY_FETCH_MULTIPLIER, FAMILY_FETCH_CAP)
}

/** Normalize q / brand / attr for Meili filters and Prisma fallback. */
export function prepareSearchQuery(query: ProductSearchQuery): ProductSearchQuery {
    const q = normalizeSearchQuery(query.q)
    return {
        ...query,
        q: q || query.q.trim(),
        brand: query.brand ? normalizeSearchQuery(query.brand) || undefined : undefined,
        attr: query.attr
            .map(v => normalizeSearchQuery(v))
            .filter((v): v is string => Boolean(v)),
        productCode: query.productCode?.trim() || undefined,
    }
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLikePattern(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export async function findIdsByAlternativeName(q: string): Promise<string[]> {
    const pattern = `%${escapeLikePattern(q)}%`
    const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT i.id
        FROM "Item" i
        WHERE i."alternativeNames" IS NOT NULL
          AND (
              (
                  jsonb_typeof(i."alternativeNames") = 'array'
                  AND EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements_text(i."alternativeNames") AS alt
                      WHERE alt ILIKE ${pattern} ESCAPE '\\'
                  )
              )
              OR (
                  jsonb_typeof(i."alternativeNames") = 'string'
                  AND (i."alternativeNames" #>> '{}') ILIKE ${pattern} ESCAPE '\\'
              )
              OR (
                  jsonb_typeof(i."alternativeNames") NOT IN ('array', 'string')
                  AND i."alternativeNames"::text ILIKE ${pattern} ESCAPE '\\'
              )
          )
    `
    return rows.map(r => r.id)
}

export function availabilityFilter(
    available: boolean | undefined
): Prisma.ItemWhereInput[] {
    if (available === undefined) return []
    return [{ isAvailable: available }]
}

export function matchesPreparedFilters(
    row: ItemRow,
    query: ProductSearchQuery,
    productId?: string | null
): boolean {
    if (productId && row.productId !== productId) return false
    if (query.available !== undefined && row.isAvailable !== query.available) {
        return false
    }
    if (query.brand) {
        const brandName = row.product.brand?.name
            ? normalizeSearchQuery(row.product.brand.name)
            : ''
        if (brandName !== query.brand) return false
    }
    for (const value of query.attr) {
        const hit = row.itemAttributes.some(
            pa => normalizeSearchQuery(pa.value) === value
        )
        if (!hit) return false
    }
    return true
}

export async function findExactByItemNumber(
    q: string,
    query: ProductSearchQuery,
    productId?: string | null
): Promise<ItemRow | null> {
    const itemId = await findItemIdByItemNumber(q)
    if (!itemId) return null

    const productWhere = productId ? { productId } : {}
    const row = await prisma.item.findFirst({
        where: {
            id: itemId,
            ...productWhere,
            ...(query.available !== undefined
                ? { isAvailable: query.available }
                : {}),
        },
        select: itemSelect,
    })
    if (!row) return null
    return matchesPreparedFilters(row, query, productId) ? row : null
}

export function buildExactAndFilters(
    query: ProductSearchQuery,
    dict: ParseDictionary,
    productId?: string | null
): Prisma.ItemWhereInput[] {
    const filters: Prisma.ItemWhereInput[] = [
        ...availabilityFilter(query.available),
    ]
    if (productId) {
        filters.push({ productId })
    }
    if (query.brand) {
        const originals = resolveBrandOriginals(query.brand, dict)
        filters.push({
            product: {
                brand: {
                    OR: originals.map(name => ({
                        name: { equals: name, mode: 'insensitive' as const },
                    })),
                },
            },
        })
    }
    for (const value of query.attr) {
        const originals = resolveAttrOriginals(value, dict)
        filters.push({
            itemAttributes: {
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

export function buildParsedMeta(
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

export function withMeta(
    groups: ProductSearchGroup[],
    opts: {
        engine: SearchEngine
        page: number
        limit: number
        estimatedFamilyTotal: number
        hasMore: boolean
        parsedMeta?: ProductSearchParsedMeta
        /** Include when search query requested customer-specific pricing */
        pricingCustomerId?: string | null
        pricingCustomerRequested?: boolean
    }
): { results: ProductSearchGroup[]; meta: ProductSearchMeta } {
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
            ...(opts.pricingCustomerRequested
                ? { customerId: opts.pricingCustomerId ?? null }
                : {}),
            ...(opts.parsedMeta ? { parsed: opts.parsedMeta } : {}),
        },
    }
}

export function emptyResult(
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

/**
 * Resolve productCode (Product.code) → Product id.
 * null means not found (caller returns empty).
 */
export async function resolveProductIdByCode(
    productCode: string | undefined
): Promise<string | null | undefined> {
    if (!productCode) return undefined
    const product = await prisma.product.findUnique({
        where: { code: productCode },
        select: { id: true },
    })
    return product?.id ?? null
}

export type ResolvedSearch = {
    prepared: ProductSearchQuery
    searchQ: string
    filterQuery: ProductSearchQuery
    parsed: ParsedProductQuery | null
    extractedApplied: boolean
    dict: ParseDictionary
    /** undefined = no filter; null = code not found — Product (SPU) id */
    productId: string | null | undefined
}

export async function resolveSearchContext(
    query: ProductSearchQuery
): Promise<ResolvedSearch> {
    const prepared = prepareSearchQuery(query)
    const [dict, productId] = await Promise.all([
        getParseDictionary(),
        resolveProductIdByCode(prepared.productCode),
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
        productId,
    }
}
