import { searchItemIdsInMeilisearch } from '@/lib/utils/meilisearch-sync'
import type { ProductSearchQuery } from './schema'
import {
    hydrateItemsInOrder,
    resolveSearchPriceContext,
} from './hydrate'
import { ingestMappedIntoProducts, sliceProductPage } from './group'
import type { MappedItem } from './hydrate'
import {
    FAMILY_SCAN_PRODUCT_CAP,
    buildParsedMeta,
    emptyResult,
    internalFetchLimit,
    resolveSearchContext,
    withMeta,
    type ResolvedSearch,
} from './shared'

export async function searchProductsMeili(
    query: ProductSearchQuery,
    ctx?: ResolvedSearch,
    relaxed = false
) {
    const resolved = ctx ?? (await resolveSearchContext(query))
    const { searchQ, filterQuery, parsed, extractedApplied, productId } =
        resolved
    const { page, limit } = filterQuery
    const parsedMeta = buildParsedMeta(parsed, relaxed)

    if (productId === null) {
        return emptyResult('meili', page, limit, parsedMeta)
    }

    const priceCtx = await resolveSearchPriceContext(query)
    const needFamilies = (page - 1) * limit + limit + 1
    const batchSize = internalFetchLimit(limit)
    const productOrder: string[] = []
    const buckets = new Map<string, MappedItem[]>()

    let offset = 0
    let estimatedProductTotal = 0
    let exhausted = false
    let scanned = 0

    while (productOrder.length < needFamilies && !exhausted) {
        const meili = await searchItemIdsInMeilisearch(searchQ, {
            limit: batchSize,
            offset,
            brand: filterQuery.brand,
            attributeValues:
                filterQuery.attr.length > 0 ? filterQuery.attr : undefined,
            isAvailable: filterQuery.available,
            productId: productId ?? undefined,
        })

        if (meili.unavailable) {
            return null
        }

        estimatedProductTotal = meili.estimatedTotal

        if (meili.ids.length === 0) {
            exhausted = true
            break
        }

        const items = await hydrateItemsInOrder(meili.ids, priceCtx)
        ingestMappedIntoProducts(items, productOrder, buckets, productId)

        offset += meili.ids.length
        scanned += meili.ids.length
        if (meili.ids.length < batchSize) {
            exhausted = true
        }
        if (scanned >= FAMILY_SCAN_PRODUCT_CAP) {
            break
        }
    }

    if (productOrder.length === 0 && extractedApplied && !relaxed) {
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
        return searchProductsMeili(query, withoutExtracted, true)
    }

    const { groups, hasMoreFromBuffer } = sliceProductPage(
        productOrder,
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
        pricingCustomerRequested: !!query.customerId,
        pricingCustomerId: priceCtx.customerId,
    })
}
