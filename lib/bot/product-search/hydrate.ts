import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
    mapItemPricesForDisplay,
    resolvePriceDisplayContext,
    type ItemPriceDisplay,
    type PriceDisplayContext,
} from '../item-price'
import type { ProductSearchItem } from './types'

/** Internal flat Item row before grouping by Product (SPU) */
export interface MappedItem {
    id: string
    itemNumber: string
    name: string
    isAvailable: boolean
    alternativeNames: string[]
    primaryImage: { url: string; alt: string | null } | null
    prices: ItemPriceDisplay[]
    /** Product (SPU) id */
    productId: string
    product: { id: string; code: string; name: string }
    brand: { id: string; name: string } | null
    category: { id: string; name: string }
    attributes: Array<{ code: string; name: string; value: string }>
}

function normalizeAlternativeNames(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

export const itemSelect = {
    id: true,
    itemNumber: true,
    name: true,
    isAvailable: true,
    alternativeNames: true,
    productId: true,
    product: {
        select: {
            id: true,
            code: true,
            name: true,
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
        },
    },
    itemAttributes: {
        select: {
            value: true,
            attribute: { select: { code: true, name: true } },
        },
        orderBy: { attribute: { name: 'asc' as const } },
    },
    itemImages: {
        select: {
            url: true,
            alt: true,
        },
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
        take: 1,
    },
    itemPrices: {
        select: {
            value: true,
            priceLabelId: true,
            priceLabel: { select: { name: true, isDefault: true } },
            unit: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' as const },
    },
} satisfies Prisma.ItemSelect

export type ItemRow = Prisma.ItemGetPayload<{ select: typeof itemSelect }>

export function mapItem(
    p: ItemRow,
    priceCtx: PriceDisplayContext
): MappedItem {
    const primary = p.itemImages[0]
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        isAvailable: p.isAvailable,
        alternativeNames: normalizeAlternativeNames(p.alternativeNames),
        primaryImage: primary
            ? { url: primary.url, alt: primary.alt }
            : null,
        prices: mapItemPricesForDisplay(p.itemPrices, priceCtx),
        productId: p.productId,
        product: {
            id: p.product.id,
            code: p.product.code,
            name: p.product.name,
        },
        brand: p.product.brand
            ? { id: p.product.brand.id, name: p.product.brand.name }
            : null,
        category: {
            id: p.product.category.id,
            name: p.product.category.name,
        },
        attributes: p.itemAttributes.map(pa => ({
            code: pa.attribute.code,
            name: pa.attribute.name,
            value: pa.value,
        })),
    }
}

export function toSearchItem(p: MappedItem): ProductSearchItem {
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        isAvailable: p.isAvailable,
        alternativeNames: p.alternativeNames,
        primaryImage: p.primaryImage,
        prices: p.prices,
        attributes: p.attributes.map(a => ({ name: a.name, value: a.value })),
    }
}

/** Slim group fields for Bot search response (no unused UUIDs). */
export function toSearchGroupFields(first: MappedItem) {
    return {
        product: { code: first.product.code, name: first.product.name },
        category: first.category.name,
        brand: first.brand?.name ?? null,
    }
}

export async function hydrateItemsInOrder(
    ids: string[],
    priceCtx: PriceDisplayContext
): Promise<MappedItem[]> {
    if (ids.length === 0) return []
    const rows = await prisma.item.findMany({
        where: { id: { in: ids } },
        select: itemSelect,
    })
    const byId = new Map(rows.map(r => [r.id, r]))
    return ids
        .map(id => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => p != null)
        .map(row => mapItem(row, priceCtx))
}

export async function resolveSearchPriceContext(query: {
    customerId?: string
    currency?: string
}): Promise<PriceDisplayContext> {
    return resolvePriceDisplayContext({
        customerId: query.customerId,
        currency: query.currency,
    })
}
