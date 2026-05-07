// ─────────────────────────────────────────────────────────────
// Internal shared helpers for inventory actions
// NOT a 'use server' file — this module is imported by server
// action files that carry their own 'use server' directive.
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { SerializedPrice, ProductUnitEntry, SerializedCategory } from '@/lib/types/product'

export { prisma, Prisma }

// ── Item number format: 3 segments separated by dashes (e.g. 001-BF-483) ──
export const ITEM_NUMBER_REGEX = /^\S+-\S+-\S+$/

// ── Standard include for all product queries ──────────────────────────────
export const PRODUCT_INCLUDE = {
    brandRef: true,
    category: true,
    productImages: { include: { mediaImage: true, variants: { select: { id: true } } } },
    variants: {
        orderBy: { order: 'asc' as const },
        include: { variantImages: { include: { mediaImage: true } } },
    },
    productPrices: {
        include: {
            priceLabel: true,
            currency: true,
            unit: { select: { id: true, name: true, pluralName: true } },
        },
        orderBy: { createdAt: 'asc' as const },
    },
    productUnits: {
        include: { unit: true },
        orderBy: { order: 'asc' as const },
    },
} as const

// ── Serialize product from DB shape to client-safe shape ──────────────────
export function serializeProduct(product: any) {
    const mediaImages = (product.productImages || []).map((pi: any) => ({
        id: pi.id,
        mediaImageId: pi.mediaImageId,
        url: pi.mediaImage.url,
        filename: pi.mediaImage.filename,
        alt: pi.mediaImage.alt,
        isPrimary: pi.isPrimary,
        order: pi.order,
        width: pi.mediaImage.width,
        height: pi.mediaImage.height,
        sizeBytes: pi.mediaImage.sizeBytes,
        variantIds: (pi.variants || []).map((v: any) => v.id),
    }))

    const variants = (product.variants || []).map((v: any) => ({
        id: v.id,
        variantNumber: v.variantNumber,
        suffix: v.suffix,
        name: v.name,
        type: v.type,
        hex: v.hex,
        order: v.order,
        isDefault: v.isDefault,
        price: v.price != null ? Number(v.price) : null,   // Decimal → number
        imageCount: (v.variantImages || []).length,
        images: (v.variantImages || []).map((vi: any) => ({
            id: vi.id,
            url: vi.mediaImage.url,
            filename: vi.mediaImage.filename,
            alt: vi.mediaImage.alt,
        })),
    }))

    const productPrices: SerializedPrice[] = (product.productPrices || []).map((pp: any) => ({
        id: pp.id,
        priceLabelId: pp.priceLabelId,
        priceLabelName: pp.priceLabel.name,
        currencyId: pp.currencyId,
        currencySymbol: pp.currency.symbol,
        currencyName: pp.currency.name,
        value: Number(pp.value),                            // Decimal → number
        unitId: pp.unitId,
        unitName: pp.unit?.name ?? '',
        conversionFactor: Number(
            (product.productUnits || []).find((pu: any) => pu.unitId === pp.unitId)?.conversionFactor ?? 1
        ),
        isAutoCalculated: pp.isAutoCalculated,
    }))

    const productUnits: ProductUnitEntry[] = (product.productUnits || []).map((pu: any) => ({
        id: pu.id,
        unitId: pu.unitId,
        unitName: pu.unit?.name ?? '',
        conversionFactor: Number(pu.conversionFactor ?? 1),  // Decimal → number
        barcode: pu.barcode || null,
        isBase: pu.isBase,
        order: pu.order,
    }))

    const brandRef = product.brandRef
        ? {
            id:   product.brandRef.id,
            name: product.brandRef.name,
            code: product.brandRef.code,
            logo: product.brandRef.logo ?? null,
          }
        : null

    const category: SerializedCategory | null = product.category
        ? {
            id:   product.category.id,
            name: product.category.name,
            code: product.category.code,
            icon: product.category.icon ?? null,
          }
        : null

    // Build a clean plain object — never spread raw Prisma models
    return {
        id:               product.id,
        itemNumber:       product.itemNumber,
        name:             product.name,
        brandId:          product.brandId ?? null,
        description:      product.description ?? null,
        isAvailable:      product.isAvailable,
        alternativeNames: product.alternativeNames ?? null,
        tags:             product.tags ?? null,
        categoryId:       product.categoryId ?? null,
        createdAt:        product.createdAt instanceof Date
                              ? product.createdAt.toISOString()
                              : product.createdAt,
        updatedAt:        product.updatedAt instanceof Date
                              ? product.updatedAt.toISOString()
                              : product.updatedAt,
        // ── serialized relations ──
        brandRef,
        category,
        mediaImages,
        variants,
        productPrices,
        productUnits,
    }
}

// ── Fetch a raw product by id — throws if not found ──────────────────────
export async function requireProduct(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma
    const product = await db.product.findUnique({
        where: { id },
        include: PRODUCT_INCLUDE,
    })
    if (!product) throw new Error('المنتج غير موجود')
    return product
}

// ── Revalidate product-related paths ─────────────────────────────────────
export function revalidateProduct(id: string) {
    revalidatePath('/inventory')
    revalidatePath(`/inventory/${id}`)
}
