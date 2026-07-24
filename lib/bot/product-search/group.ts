import type { MappedItem } from './hydrate'
import { toSearchGroupFields, toSearchItem } from './hydrate'
import type { ProductSearchGroup } from './types'

function toSearchGroup(list: MappedItem[]): ProductSearchGroup {
    return {
        ...toSearchGroupFields(list[0]),
        items: list.map(toSearchItem),
    }
}

/** Group flat matched items by productId (SPU), preserving first-seen order. */
export function groupItemsByProduct(items: MappedItem[]): ProductSearchGroup[] {
    const order: string[] = []
    const buckets = new Map<string, MappedItem[]>()

    for (const p of items) {
        let list = buckets.get(p.productId)
        if (!list) {
            list = []
            buckets.set(p.productId, list)
            order.push(p.productId)
        }
        if (!list.some(x => x.id === p.id)) {
            list.push(p)
        }
    }

    return order.map(productId => toSearchGroup(buckets.get(productId)!))
}

export function ingestMappedIntoProducts(
    items: MappedItem[],
    productOrder: string[],
    buckets: Map<string, MappedItem[]>,
    productIdFilter?: string | null
) {
    for (const p of items) {
        if (productIdFilter && p.productId !== productIdFilter) continue
        let list = buckets.get(p.productId)
        if (!list) {
            list = []
            buckets.set(p.productId, list)
            productOrder.push(p.productId)
        }
        if (!list.some(x => x.id === p.id)) {
            list.push(p)
        }
    }
}

export function sliceProductPage(
    productOrder: string[],
    buckets: Map<string, MappedItem[]>,
    page: number,
    limit: number
): {
    groups: ProductSearchGroup[]
    hasMoreFromBuffer: boolean
} {
    const skip = (page - 1) * limit
    const sliceIds = productOrder.slice(skip, skip + limit)
    const groups = sliceIds.map(id => toSearchGroup(buckets.get(id)!))
    return {
        groups,
        hasMoreFromBuffer: productOrder.length > skip + limit,
    }
}
