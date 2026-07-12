// ─────────────────────────────────────────────────────────────
// Internal shared helpers for inventory actions
// NOT a 'use server' file — this module is imported by server
// action files that carry their own 'use server' directive.
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { SerializedPrice, ProductUnitEntry, SerializedCategory } from '@/lib/types/product'
import type { SerializedSKC, SerializedSKU } from '@/lib/types/skc'
import { flatColorFields, mapColorRef } from '@/lib/types/skc'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { parseSkcAttributes } from '@/lib/utils/skc-attributes'
import { PRODUCT_NUMBER_CONFIG } from '@/lib/config/product-number.config'

export { prisma, Prisma }

export function normalizeProductNumber(input: string): string {
    return input.trim().toUpperCase()
}

export function validateProductNumber(
    input: string
): { ok: true; value: string } | { ok: false; error: string } {
    const value = normalizeProductNumber(input)
    if (value.length !== PRODUCT_NUMBER_CONFIG.length) {
        return { ok: false, error: `رقم المنتج يجب أن يكون ${PRODUCT_NUMBER_CONFIG.length} خانات` }
    }
    if (!PRODUCT_NUMBER_CONFIG.regex.test(value)) {
        return { ok: false, error: 'رقم المنتج: 3 أحرف أو أرقام إنجليزية فقط' }
    }
    return { ok: true, value }
}

export function sizeSuffix(label: string | null | undefined): string | null {
    if (!label?.trim()) return null
    const s = label.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    return s || 'SZ'
}

export function buildSkuCode(productNumber: string, colorCode: string, sizeLabel?: string | null): string {
    const size = sizeSuffix(sizeLabel)
    if (size) return `${productNumber}-${colorCode}-${size}`
    return `${productNumber}-${colorCode}`
}

export const COLOR_SELECT = {
    id: true,
    code: true,
    name: true,
    hexCode: true,
} as const

export async function getDefaultColorId(
    tx?: Prisma.TransactionClient
): Promise<string> {
    const db = tx ?? prisma
    const color = await db.color.findUnique({ where: { code: 'ST' }, select: { id: true } })
    if (!color) throw new Error('اللون الافتراضي (ST) غير موجود — شغّل db:seed')
    return color.id
}

export async function findNextAvailableProductNumber(
    tx?: Prisma.TransactionClient
): Promise<string | null> {
    const db = tx ?? prisma
    const used = new Set(
        (await db.product.findMany({ select: { productNumber: true } }))
            .map(p => p.productNumber.toUpperCase())
    )

    for (let i = 1; i <= 999; i++) {
        const num = String(i).padStart(3, '0')
        if (!used.has(num)) return num
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    for (const a of chars) {
        for (const b of chars) {
            for (const c of chars) {
                const code = `${a}${b}${c}`
                if (!used.has(code)) return code
            }
        }
    }
    return null
}

export async function rebuildProductSkuCodes(
    productId: string,
    productNumber: string,
    tx?: Prisma.TransactionClient
): Promise<void> {
    const db = tx ?? prisma
    const skcs = await db.sKC.findMany({
        where: { productId },
        include: { skus: true, color: { select: { code: true } } },
    })

    for (const skc of skcs) {
        for (const sku of skc.skus) {
            const skuCode = buildSkuCode(productNumber, skc.color.code, sku.sizeLabel)
            await db.sKU.update({ where: { id: sku.id }, data: { skuCode } })
        }
    }
}

/** @deprecated Auto-generation removed — use validateProductNumber */
export async function generateProductNumber(): Promise<never> {
    throw new Error('generateProductNumber is deprecated — product number is entered manually')
}

/** @deprecated Use validateProductNumber */
export const generateProductCode = generateProductNumber

export const SKU_PRICE_INCLUDE = {
    priceLabel: true,
    currency: true,
    unit: { select: { id: true, name: true, pluralName: true } },
} as const

export const SKU_INCLUDE = {
    orderBy: { order: 'asc' as const },
    include: {
        productPrices: {
            include: SKU_PRICE_INCLUDE,
            orderBy: { createdAt: 'asc' as const },
        },
    },
} as const

export const SKC_INCLUDE = {
    orderBy: { order: 'asc' as const },
    include: {
        color: { select: COLOR_SELECT },
        images: { orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }] },
        skus: SKU_INCLUDE,
    },
} as const

export const PRODUCT_INCLUDE = {
    brandRef: true,
    category: true,
    productUnits: {
        include: { unit: true },
        orderBy: { order: 'asc' as const },
    },
    skcs: SKC_INCLUDE,
} as const

export const PRODUCT_LIST_INCLUDE = {
    brandRef: { select: { id: true, name: true, code: true, logo: true } },
    category: { select: { id: true, name: true, code: true, icon: true } },
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
    skcs: {
        orderBy: { order: 'asc' as const },
        select: {
            id: true,
            colorId: true,
            color: { select: COLOR_SELECT },
            isDefault: true,
            isAvailable: true,
            images: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true },
            },
            _count: { select: { skus: true } },
        },
    },
    _count: { select: { skcs: true } },
} as const

export const SKC_DETAIL_INCLUDE = {
    color: { select: COLOR_SELECT },
    images: { orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }] },
    skus: SKU_INCLUDE,
    product: {
        include: {
            brandRef: { select: { id: true, name: true, code: true } },
            category: { select: { id: true, name: true, code: true } },
            productUnits: {
                include: { unit: true },
                orderBy: { order: 'asc' as const },
            },
        },
    },
} as const

function serializePrices(prices: any[], productUnits: any[]): SerializedPrice[] {
    return (prices || []).map((pp: any) => ({
        id: pp.id,
        priceLabelId: pp.priceLabelId,
        priceLabelName: pp.priceLabel.name,
        currencyId: pp.currencyId,
        currencySymbol: pp.currency.symbol,
        currencyName: pp.currency.name,
        value: Number(pp.value),
        unitId: pp.unitId,
        unitName: pp.unit?.name ?? '',
        conversionFactor: Number(
            (productUnits || []).find((pu: any) => pu.unitId === pp.unitId)?.conversionFactor ?? 1
        ),
        isAutoCalculated: pp.isAutoCalculated,
    }))
}

export function serializeSKU(sku: any, productUnits: any[] = []): SerializedSKU {
    return {
        id: sku.id,
        skuCode: sku.skuCode,
        sizeLabel: sku.sizeLabel ?? null,
        isAvailable: sku.isAvailable,
        isDefault: sku.isDefault,
        order: sku.order,
        productPrices: serializePrices(sku.productPrices || [], productUnits),
    }
}

export function serializeSKC(skc: any, productUnits: any[] = []): SerializedSKC {
    const color = mapColorRef(skc.color)
    return {
        id: skc.id,
        color,
        ...flatColorFields(color),
        itemNumber: skc.itemNumber ?? null,
        attributes: parseSkcAttributes(skc.attributes),
        isDefault: skc.isDefault,
        isAvailable: skc.isAvailable,
        order: skc.order,
        productId: skc.productId,
        images: (skc.images || []).map((pi: any) => ({
            id: pi.id,
            url: toDisplayUrl(pi.url),
            filename: pi.filename,
            alt: pi.alt,
            isPrimary: pi.isPrimary,
            order: pi.order,
            width: pi.width,
            height: pi.height,
            sizeBytes: pi.sizeBytes,
        })),
        skus: (skc.skus || []).map((s: any) => serializeSKU(s, productUnits)),
        skuCount: skc._count?.skus ?? (skc.skus || []).length,
    }
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

/** Product is available when at least one SKC is marked available */
export function deriveProductAvailability(
    skcs: Array<{ isAvailable?: boolean }> | undefined
): boolean {
    return (skcs ?? []).some(s => s.isAvailable)
}

export const PRODUCT_WITH_AVAILABLE_SKC = {
    skcs: { some: { isAvailable: true } },
} satisfies Prisma.ProductWhereInput

export function serializeProduct(product: any) {
    const productUnits = serializeProductUnits(product.productUnits || [])
    const skcs = (product.skcs || []).map((s: any) => serializeSKC(s, productUnits))

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

    const allPrices = skcs.flatMap((skc: SerializedSKC) => skc.skus.flatMap((sku: SerializedSKU) => sku.productPrices))
    const primarySkc = skcs.find((s: SerializedSKC) => s.isDefault) || skcs[0]
    const mediaImages = primarySkc?.images ?? []

    return {
        id:               product.id,
        productNumber:    product.productNumber,
        slug:             product.slug,
        name:             product.name,
        brandId:          product.brandId ?? null,
        description:      product.description ?? null,
        alternativeNames: Array.isArray(product.alternativeNames) ? product.alternativeNames : [],
        tags:             Array.isArray(product.tags) ? product.tags : [],
        categoryId:       product.categoryId ?? null,
        skuSpecKind:      product.skuSpecKind ?? 'free',
        createdAt:        product.createdAt instanceof Date
                              ? product.createdAt.toISOString()
                              : product.createdAt,
        updatedAt:        product.updatedAt instanceof Date
                              ? product.updatedAt.toISOString()
                              : product.updatedAt,
        brandRef,
        category,
        mediaImages,
        skcs,
        skcCount: product._count?.skcs ?? skcs.length,
        productPrices: allPrices,
        productUnits,
        // legacy alias for gradual UI migration
        variants: skcs.map((skc: SerializedSKC) => ({
            id: skc.id,
            variantNumber: skc.skus[0]?.skuCode ?? `${product.productNumber}-${skc.colorCode}`,
            suffix: skc.colorCode,
            name: skc.colorName,
            type: 'color',
            hex: skc.hexCode,
            order: skc.order,
            isDefault: skc.isDefault,
            price: null,
            imageCount: skc.images.length,
            images: skc.images,
        })),
    }
}

export async function getProductIdFromSkuId(skuId: string): Promise<string | null> {
    const sku = await prisma.sKU.findUnique({
        where: { id: skuId },
        select: { skc: { select: { productId: true } } },
    })
    return sku?.skc.productId ?? null
}

export async function productHasPricesAndUnits(productId: string): Promise<boolean> {
    const [unitsCount, pricesCount] = await Promise.all([
        prisma.productUnit.count({ where: { productId } }),
        prisma.productPrice.count({
            where: { sku: { skc: { productId } } },
        }),
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
    revalidatePath('/items')
    revalidatePath(`/items`)
}

export function revalidateSkc(skcId: string, productId?: string) {
    revalidatePath('/items')
    if (productId) revalidateProduct(productId)
}

export function revalidateSku(skuId: string, productId?: string) {
    revalidatePath('/items')
    revalidatePath(`/items/${skuId}`)
    if (productId) revalidateProduct(productId)
}

export function revalidateItem(itemId: string, productId?: string) {
    revalidateSku(itemId, productId)
}

export async function revalidateAllSkusForSkc(skcId: string, productId?: string) {
    revalidatePath('/items')
    const skus = await prisma.sKU.findMany({
        where: { skcId },
        select: { id: true },
    })
    for (const s of skus) {
        revalidatePath(`/items/${s.id}`)
    }
    if (productId) revalidateProduct(productId)
}
