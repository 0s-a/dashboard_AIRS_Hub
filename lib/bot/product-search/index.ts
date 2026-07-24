import type { ProductSearchQuery } from './schema'
import {
    emptyResult,
    prepareSearchQuery,
    resolveProductIdByCode,
    resolveSearchContext,
} from './shared'
import { searchProductsMeili } from './meili'
import { searchProductsPrisma } from './prisma'

export { ProductSearchQuerySchema, parseProductSearchQuery } from './schema'
export type { ProductSearchQuery } from './schema'

export type {
    SearchEngine,
    ProductSearchItem,
    ProductSearchGroup,
    ProductSearchParsedMeta,
    ProductSearchMeta,
} from './types'

export { groupItemsByProduct } from './group'
export { searchProductsPrisma } from './prisma'

/**
 * Bot product search: Meilisearch (fuzzy + full-text) with Prisma hydrate,
 * results grouped by Product (SPU).
 * Exact itemNumber lookup: use GET /api/v1/bot/items/by-number instead.
 */
export async function searchProducts(query: ProductSearchQuery) {
    const prepared = prepareSearchQuery(query)
    const productId = await resolveProductIdByCode(prepared.productCode)

    if (productId === null) {
        return emptyResult('prisma', prepared.page, prepared.limit)
    }

    const ctx = await resolveSearchContext(query)
    const meiliResult = await searchProductsMeili(query, ctx)
    if (meiliResult) return meiliResult
    return searchProductsPrisma(query, ctx)
}
