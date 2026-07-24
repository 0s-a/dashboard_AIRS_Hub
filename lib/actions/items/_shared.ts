// ─────────────────────────────────────────────────────────────
// Internal shared helpers for item (SKU) actions
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
    SerializedPrice,
    ItemUnitEntry,
    SerializedCategory,
    SerializedItemAttribute,
} from '@/lib/types/item'
import { toDisplayUrl } from '@/lib/utils/image-paths'

export { prisma, Prisma }

export const ITEM_ATTRIBUTE_INCLUDE = {
    attribute: { select: { id: true, code: true, name: true, examples: true } },
} as const

export const ITEM_PRICE_INCLUDE = {
    priceLabel: true,
    unit: { select: { id: true, name: true, pluralName: true } },
} as const

export const PRODUCT_SELECT = {
    id: true,
    code: true,
    name: true,
    categoryId: true,
    brandId: true,
    category: { select: { id: true, name: true, code: true } },
    brand: { select: { id: true, name: true, code: true, logo: true } },
} as const

export const ITEM_INCLUDE = {
    product: { select: PRODUCT_SELECT },
    itemAttributes: {
        include: ITEM_ATTRIBUTE_INCLUDE,
        orderBy: { attribute: { name: 'asc' as const } },
    },
    itemImages: {
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
    },
    itemPrices: {
        include: ITEM_PRICE_INCLUDE,
        orderBy: { createdAt: 'asc' as const },
    },
    itemUnits: {
        include: { unit: true },
        orderBy: { order: 'asc' as const },
    },
} as const

export const ITEM_LIST_INCLUDE = {
    product: { select: PRODUCT_SELECT },
    itemAttributes: {
        include: ITEM_ATTRIBUTE_INCLUDE,
        orderBy: { attribute: { name: 'asc' as const } },
    },
    itemImages: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
    },
    itemPrices: { select: { id: true } },
    itemUnits: {
        select: {
            id: true,
            unitId: true,
            isBase: true,
            conversionFactor: true,
            barcode: true,
            order: true,
            unit: { select: { name: true } },
        },
        orderBy: { order: 'asc' as const },
    },
} as const

function serializePrices(prices: any[], itemUnits: any[]): SerializedPrice[] {
    return (prices || [])
        .filter((pp: any) => pp.priceLabel)
        .map((pp: any) => ({
            id: pp.id,
            priceLabelId: pp.priceLabelId,
            priceLabelName: pp.priceLabel.name,
            value: Number(pp.value),
            unitId: pp.unitId,
            unitName: pp.unit?.name ?? '',
            conversionFactor: Number(
                (itemUnits || []).find((iu: any) => iu.unitId === pp.unitId)?.conversionFactor ?? 1
            ),
            isAutoCalculated: pp.isAutoCalculated,
        }))
}

export function serializeItemUnits(itemUnits: any[]): ItemUnitEntry[] {
    return (itemUnits || []).map((iu: any) => ({
        id: iu.id,
        unitId: iu.unitId,
        unitName: iu.unit?.name ?? '',
        conversionFactor: Number(iu.conversionFactor ?? 1),
        barcode: iu.barcode || null,
        isBase: iu.isBase,
        order: iu.order,
    }))
}

export function serializeItemAttributes(rows: any[]): SerializedItemAttribute[] {
    return (rows || []).map((row: any) => ({
        id: row.id,
        attributeId: row.attributeId,
        code: row.attribute?.code ?? '',
        name: row.attribute?.name ?? '',
        value: row.value,
        examples: Array.isArray(row.attribute?.examples)
            ? row.attribute.examples.filter((x: unknown): x is string => typeof x === 'string')
            : [],
    }))
}

export function normalizeAttributeInputs(
    entries?: { attributeId: string; value: string }[] | null
): { attributeId: string; value: string }[] {
    if (!entries?.length) return []
    const seen = new Set<string>()
    const out: { attributeId: string; value: string }[] = []
    for (const entry of entries) {
        const attributeId = entry.attributeId?.trim()
        const value = entry.value?.trim()
        if (!attributeId || !value) continue
        if (seen.has(attributeId)) {
            throw new Error('لا يمكن تكرار نفس الصفة على الصنف')
        }
        seen.add(attributeId)
        out.push({ attributeId, value })
    }
    return out
}

export function serializeItem(item: any) {
    const itemUnits = serializeItemUnits(item.itemUnits || [])
    const rawPrices = item.itemPrices || []
    const itemPrices = serializePrices(rawPrices, itemUnits)
    const priceCount = item._count?.itemPrices ?? rawPrices.length
    const itemAttributes = serializeItemAttributes(item.itemAttributes || [])

    const mediaImages = (item.itemImages || []).map((ii: any) => ({
        id: ii.id,
        url: toDisplayUrl(ii.url),
        filename: ii.filename,
        alt: ii.alt,
        isPrimary: ii.isPrimary,
        order: ii.order,
        width: ii.width,
        height: ii.height,
        sizeBytes: ii.sizeBytes,
        itemId: ii.itemId ?? item.id,
    }))

    const primary = mediaImages.find((i: any) => i.isPrimary) ?? mediaImages[0]

    const productBrand = item.product?.brand
    const brandRef = {
        id: productBrand?.id ?? '',
        name: productBrand?.name ?? '',
        code: productBrand?.code ?? '',
        logo: productBrand?.logo ?? null,
    }

    const productCategory = item.product?.category
    const category: SerializedCategory = {
        id: productCategory?.id ?? '',
        name: productCategory?.name ?? '',
        code: productCategory?.code ?? '',
    }

    const product = {
        id: item.product.id,
        code: item.product.code,
        name: item.product.name,
    }

    return {
        id: item.id,
        itemNumber: item.itemNumber,
        slug: item.slug,
        name: item.name,
        displayName: item.name,
        brandId: item.product.brandId ?? brandRef.id,
        description: item.description ?? null,
        alternativeNames: Array.isArray(item.alternativeNames) ? item.alternativeNames : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
        categoryId: item.product.categoryId ?? category.id,
        productId: item.productId,
        product,
        itemAttributes,
        isAvailable: item.isAvailable ?? true,
        order: item.order ?? 0,
        createdAt: item.createdAt instanceof Date
            ? item.createdAt.toISOString()
            : item.createdAt,
        updatedAt: item.updatedAt instanceof Date
            ? item.updatedAt.toISOString()
            : item.updatedAt,
        brandRef,
        category,
        mediaImages,
        primaryImage: primary?.url ?? null,
        itemPrices,
        itemUnits,
        priceCount,
    }
}

export async function itemHasPricesAndUnits(itemId: string): Promise<boolean> {
    const [unitsCount, pricesCount] = await Promise.all([
        prisma.itemUnit.count({ where: { itemId } }),
        prisma.itemPrice.count({ where: { itemId } }),
    ])
    return unitsCount > 0 && pricesCount > 0
}

export async function requireItem(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma
    const item = await db.item.findUnique({
        where: { id },
        include: ITEM_INCLUDE as any,
    })
    if (!item) throw new Error('الصنف غير موجود')
    return item
}

export function revalidateItem(id: string) {
    revalidatePath('/items')
    revalidatePath('/products')
    revalidatePath(`/items/${id}`)
}

export async function revalidateItemPricing(itemId: string) {
    revalidateItem(itemId)
}
