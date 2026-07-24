import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ProductSearchQuery } from './schema'
import {
    itemSelect,
    mapItem,
    resolveSearchPriceContext,
    type MappedItem,
} from './hydrate'
import { ingestMappedIntoProducts, sliceProductPage } from './group'
import {
    FAMILY_FETCH_MULTIPLIER,
    FAMILY_SCAN_PRODUCT_CAP,
    buildExactAndFilters,
    buildParsedMeta,
    emptyResult,
    findExactByItemNumber,
    findIdsByAlternativeName,
    internalFetchLimit,
    resolveSearchContext,
    withMeta,
    type ResolvedSearch,
} from './shared'

/** Prisma ILIKE search — used only when Meilisearch is unavailable. */
export async function searchProductsPrisma(
    query: ProductSearchQuery,
    ctx?: ResolvedSearch,
    relaxed = false
) {
    const resolved = ctx ?? (await resolveSearchContext(query))
    const { searchQ, filterQuery, parsed, extractedApplied, dict, productId } =
        resolved
    const { page, limit } = filterQuery
    const parsedMeta = buildParsedMeta(parsed, relaxed)

    if (productId === null) {
        return emptyResult('prisma', page, limit, parsedMeta)
    }

    const priceCtx = await resolveSearchPriceContext(query)
    const q = searchQ
    const andFilters = buildExactAndFilters(filterQuery, dict, productId)

    const [exact, altIds] = await Promise.all([
        q
            ? findExactByItemNumber(q, filterQuery, productId)
            : Promise.resolve(null),
        q ? findIdsByAlternativeName(q) : Promise.resolve([] as string[]),
    ])

    const textOr: Prisma.ItemWhereInput[] = q
        ? [
              { name: { contains: q, mode: 'insensitive' } },
              { itemNumber: { contains: q, mode: 'insensitive' } },
              {
                  product: {
                      brand: {
                          name: { contains: q, mode: 'insensitive' },
                      },
                  },
              },
              {
                  product: {
                      name: { contains: q, mode: 'insensitive' },
                  },
              },
              {
                  itemAttributes: {
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

    const fuzzyWhere: Prisma.ItemWhereInput = {
        AND: [
            ...(textOr.length > 0 ? [{ OR: textOr }] : []),
            ...andFilters,
            ...(exact ? [{ id: { not: exact.id } }] : []),
        ],
    }

    const fuzzyTotal = await prisma.item.count({ where: fuzzyWhere })
    const itemTotal = fuzzyTotal + (exact ? 1 : 0)

    if (itemTotal === 0 && extractedApplied && !relaxed) {
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
            productId: resolved.productId,
        }
        return searchProductsPrisma(query, withoutExtracted, true)
    }

    const needFamilies = (page - 1) * limit + limit + 1
    const take = Math.min(
        Math.max(needFamilies * FAMILY_FETCH_MULTIPLIER, internalFetchLimit(limit)),
        FAMILY_SCAN_PRODUCT_CAP
    )

    const mapped: MappedItem[] = []
    if (exact) {
        mapped.push(mapItem(exact, priceCtx))
    }
    const rows = await prisma.item.findMany({
        where: fuzzyWhere,
        select: itemSelect,
        orderBy: { name: 'asc' },
        take,
        skip: 0,
    })
    for (const row of rows) {
        mapped.push(mapItem(row, priceCtx))
    }

    const productOrder: string[] = []
    const buckets = new Map<string, MappedItem[]>()
    ingestMappedIntoProducts(mapped, productOrder, buckets, productId)

    const { groups, hasMoreFromBuffer } = sliceProductPage(
        productOrder,
        buckets,
        page,
        limit
    )
    const hasMore =
        hasMoreFromBuffer ||
        mapped.length >= take ||
        itemTotal > mapped.length

    const estimatedFamilyTotal = Math.max(
        productOrder.length,
        Math.ceil(itemTotal / 2)
    )

    return withMeta(groups, {
        engine: 'prisma',
        page,
        limit,
        estimatedFamilyTotal,
        hasMore,
        parsedMeta,
        pricingCustomerRequested: !!query.customerId,
        pricingCustomerId: priceCtx.customerId,
    })
}
