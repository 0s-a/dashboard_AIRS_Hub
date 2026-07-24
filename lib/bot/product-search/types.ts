import { paginationMeta } from '@/lib/api-utils'
import type { ItemPriceDisplay } from '../item-price'

export type SearchEngine = 'meili' | 'prisma'

/** Matched Item (SKU) inside a Product (SPU) group — slim for bot display */
export interface ProductSearchItem {
    id: string
    itemNumber: string
    name: string
    isAvailable: boolean
    alternativeNames: string[]
    primaryImage: { url: string; alt: string | null } | null
    prices: ItemPriceDisplay[]
    attributes: Array<{ name: string; value: string }>
}

/** One search hit grouped by Product (SPU) — no unused UUIDs */
export interface ProductSearchGroup {
    product: { code: string; name: string }
    category: string
    brand: string | null
    items: ProductSearchItem[]
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
    hasMore: boolean
    /** Resolved pricing customer when customerId was passed on the query */
    customerId?: string | null
    parsed?: ProductSearchParsedMeta
}
