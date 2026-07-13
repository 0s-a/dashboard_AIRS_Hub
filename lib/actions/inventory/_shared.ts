// ─────────────────────────────────────────────────────────────
// Internal shared helpers for inventory actions
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
    SerializedPrice,
    ProductUnitEntry,
    SerializedCategory,
    SerializedProductAttribute,
} from '@/lib/types/product'
import { toDisplayUrl } from '@/lib/utils/image-paths'

export { prisma, Prisma }

export const PRODUCT_ATTRIBUTE_INCLUDE = {
    attribute: { select: { id: true, code: true, name: true, examples: true } },
} as const

export const PRODUCT_PRICE_INCLUDE = {
    priceLabel: true,
    unit: { select: { id: true, name: true, pluralName: true } },
} as const

export const PRODUCT_INCLUDE = {
    brandRef: true,
    category: true,
    productAttributes: {
        include: PRODUCT_ATTRIBUTE_INCLUDE,
        orderBy: { attribute: { name: 'asc' as const } },
    },
    productImages: {
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
    },
    productPrices: {
        include: PRODUCT_PRICE_INCLUDE,
        orderBy: { createdAt: 'asc' as const },
    },
    productUnits: {
        include: { unit: true },
        orderBy: { order: 'asc' as const },
    },
} as const

export const PRODUCT_LIST_INCLUDE = {
    brandRef: { select: { id: true, name: true, code: true, logo: true } },
    category: { select: { id: true, name: true, code: true } },
    productAttributes: {
        include: PRODUCT_ATTRIBUTE_INCLUDE,
        orderBy: { attribute: { name: 'asc' as const } },
    },
    productImages: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
    },
    productPrices: { select: { id: true } },
    productUnits: {
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

function serializePrices(prices: any[], productUnits: any[]): SerializedPrice[] {
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
            (productUnits || []).find((pu: any) => pu.unitId === pp.unitId)?.conversionFactor ?? 1
        ),
        isAutoCalculated: pp.isAutoCalculated,
    }))
}

export function serializeProductUnits(productUnits: any[]): ProductUnitEntry[] {
    return (productUnits || []).map((pu: any) => ({
        id: pu.id,
        unitId: pu.unitId,
        unitName: pu.unit?.name ?? '',
        conversionFactor: Number(pu.conversionFactor ?? 1),
        barcode: pu.barcode || null,
        isBase: pu.isBase,
        order: pu.order,
    }))
}

export function serializeProductAttributes(rows: any[]): SerializedProductAttribute[] {
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
            throw new Error('لا يمكن تكرار نفس الصفة على المنتج')
        }
        seen.add(attributeId)
        out.push({ attributeId, value })
    }
    return out
}

export function serializeProduct(product: any) {
    const productUnits = serializeProductUnits(product.productUnits || [])
    const rawPrices = product.productPrices || []
    const productPrices = serializePrices(rawPrices, productUnits)
    const priceCount = product._count?.productPrices ?? rawPrices.length
    const productAttributes = serializeProductAttributes(product.productAttributes || [])

    const mediaImages = (product.productImages || []).map((pi: any) => ({
        id: pi.id,
        url: toDisplayUrl(pi.url),
        filename: pi.filename,
        alt: pi.alt,
        isPrimary: pi.isPrimary,
        order: pi.order,
        width: pi.width,
        height: pi.height,
        sizeBytes: pi.sizeBytes,
        productId: pi.productId ?? product.id,
    }))

    const primary = mediaImages.find((i: any) => i.isPrimary) ?? mediaImages[0]

    const brandRef = {
        id: product.brandRef.id,
        name: product.brandRef.name,
        code: product.brandRef.code,
        logo: product.brandRef.logo ?? null,
    }

    const category: SerializedCategory = {
        id: product.category.id,
        name: product.category.name,
        code: product.category.code,
    }

    return {
        id: product.id,
        itemNumber: product.itemNumber,
        slug: product.slug,
        name: product.name,
        brandId: product.brandId,
        description: product.description ?? null,
        alternativeNames: Array.isArray(product.alternativeNames) ? product.alternativeNames : [],
        tags: Array.isArray(product.tags) ? product.tags : [],
        categoryId: product.categoryId,
        productAttributes,
        isAvailable: product.isAvailable ?? true,
        order: product.order ?? 0,
        createdAt: product.createdAt instanceof Date
            ? product.createdAt.toISOString()
            : product.createdAt,
        updatedAt: product.updatedAt instanceof Date
            ? product.updatedAt.toISOString()
            : product.updatedAt,
        brandRef,
        category,
        mediaImages,
        primaryImage: primary?.url ?? null,
        productPrices,
        productUnits,
        priceCount,
    }
}

export async function productHasPricesAndUnits(productId: string): Promise<boolean> {
    const [unitsCount, pricesCount] = await Promise.all([
        prisma.productUnit.count({ where: { productId } }),
        prisma.productPrice.count({ where: { productId } }),
    ])
    return unitsCount > 0 && pricesCount > 0
}

export async function requireProduct(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma
    const product = await db.product.findUnique({
        where: { id },
        include: PRODUCT_INCLUDE as any,
    })
    if (!product) throw new Error('المنتج غير موجود')
    return product
}

export function revalidateProduct(id: string) {
    revalidatePath('/products')
    revalidatePath('/inventory')
    revalidatePath(`/products/${id}`)
}

export async function revalidateProductPricing(productId: string) {
    revalidateProduct(productId)
}
