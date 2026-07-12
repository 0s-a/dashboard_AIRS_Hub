'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import {
    SKU_INCLUDE,
    SKU_PRICE_INCLUDE,
    serializeSKU,
    serializeProductUnits,
    revalidateSkc,
    revalidateSku,
    buildSkuCode,
    COLOR_SELECT,
} from '@/lib/actions/inventory/_shared'
import type { SkuInput, SerializedSKUListItem, SerializedSKUDetail } from '@/lib/types/skc'
import { flatColorFields, mapColorRef } from '@/lib/types/skc'
import { upsertProductToMeilisearch } from '@/lib/utils/meilisearch-sync'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { parseSkcAttributes } from '@/lib/utils/skc-attributes'

export async function addSKU(data: SkuInput) {
    try {
        await requireAuth()
        const skc = await prisma.sKC.findUnique({
            where: { id: data.skcId },
            include: {
                color: { select: { code: true } },
                product: { select: { productNumber: true } },
            },
        })
        if (!skc) return { success: false, error: 'الصنف غير موجود' }

        const sizeLabel = data.sizeLabel?.trim() || null
        const dup = await prisma.sKU.findFirst({
            where: { skcId: data.skcId, sizeLabel },
        })
        if (dup) return { success: false, error: 'هذا الصنف موجود بالفعل لهذا اللون' }

        const count = await prisma.sKU.count({ where: { skcId: data.skcId } })
        const skuCode = buildSkuCode(skc.product.productNumber, skc.color.code, sizeLabel)

        const existingCode = await prisma.sKU.findUnique({ where: { skuCode } })
        if (existingCode) return { success: false, error: `الرمز ${skuCode} مستخدم بالفعل` }

        const sku = await prisma.sKU.create({
            data: {
                skcId: data.skcId,
                skuCode,
                sizeLabel,
                isDefault: data.isDefault ?? count === 0,
                order: count,
            },
            include: SKU_INCLUDE.include as any,
        })

        const product = await prisma.product.findUnique({
            where: { id: skc.productId },
            include: { productUnits: { include: { unit: true } } },
        })
        revalidateSku(sku.id, skc.productId)
        revalidateSkc(data.skcId, skc.productId)
        upsertProductToMeilisearch(skc.productId).catch(console.warn)
        return {
            success: true,
            data: serializeSKU(sku, serializeProductUnits(product?.productUnits ?? [])),
        }
    } catch (error: any) {
        console.error('addSKU:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة المقاس' }
    }
}

export async function updateSKU(skuId: string, data: { sizeLabel?: string | null; isAvailable?: boolean; isDefault?: boolean }) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: skuId },
            include: {
                skc: {
                    include: {
                        color: { select: { code: true } },
                        product: { select: { productNumber: true } },
                    },
                },
            },
        })
        if (!sku) return { success: false, error: 'المقاس غير موجود' }

        const sizeLabel = data.sizeLabel !== undefined ? (data.sizeLabel?.trim() || null) : sku.sizeLabel
        if (sizeLabel !== sku.sizeLabel) {
            const dup = await prisma.sKU.findFirst({
                where: { skcId: sku.skcId, sizeLabel, NOT: { id: skuId } },
            })
            if (dup) return { success: false, error: 'هذا الصنف موجود بالفعل لهذا اللون' }
        }

        const newCode = buildSkuCode(sku.skc.product.productNumber, sku.skc.color.code, sizeLabel)
        const codeDup = await prisma.sKU.findFirst({ where: { skuCode: newCode, NOT: { id: skuId } } })
        if (codeDup) return { success: false, error: `الرمز ${newCode} مستخدم بالفعل` }

        const updated = await prisma.sKU.update({
            where: { id: skuId },
            data: {
                sizeLabel,
                skuCode: newCode,
                isAvailable: data.isAvailable,
                isDefault: data.isDefault,
            },
            include: SKU_INCLUDE.include as any,
        })

        const product = await prisma.product.findUnique({
            where: { id: sku.skc.productId },
            include: { productUnits: { include: { unit: true } } },
        })
        revalidateSku(skuId, sku.skc.productId)
        revalidateSkc(sku.skcId, sku.skc.productId)
        upsertProductToMeilisearch(sku.skc.productId).catch(console.warn)
        return {
            success: true,
            data: serializeSKU(updated, serializeProductUnits(product?.productUnits ?? [])),
        }
    } catch (error: any) {
        console.error('updateSKU:', error)
        return { success: false, error: error?.message ?? 'فشل تحديث المقاس' }
    }
}

export async function removeSKU(skuId: string) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: skuId },
            select: { skcId: true, skc: { select: { productId: true } } },
        })
        if (!sku) return { success: false, error: 'المقاس غير موجود' }

        const remaining = await prisma.sKU.count({ where: { skcId: sku.skcId } })
        if (remaining <= 1) return { success: false, error: 'لا يمكن حذف آخر مقاس للصنف' }

        await prisma.sKU.delete({ where: { id: skuId } })
        revalidateSku(skuId, sku.skc.productId)
        revalidateSkc(sku.skcId, sku.skc.productId)
        upsertProductToMeilisearch(sku.skc.productId).catch(console.warn)
        return { success: true }
    } catch (error) {
        console.error('removeSKU:', error)
        return { success: false, error: 'فشل حذف المقاس' }
    }
}

export async function toggleSkuAvailability(skuId: string, current: boolean) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.update({
            where: { id: skuId },
            data: { isAvailable: !current },
            select: { skc: { select: { id: true, productId: true } } },
        })
        revalidateSku(skuId, sku.skc.productId)
        revalidateSkc(sku.skc.id, sku.skc.productId)
        upsertProductToMeilisearch(sku.skc.productId).catch(console.warn)
        return { success: true, data: { isAvailable: !current } }
    } catch (error) {
        return { success: false, error: 'فشل تحديث التوفر' }
    }
}

export async function getSKUsPaginated(params: {
    page?: number
    limit?: number
    search?: string
    productId?: string
    categoryId?: string
    brandId?: string
    isAvailable?: boolean
}) {
    try {
        await requireAuth()
        const page = params.page ?? 1
        const limit = Math.min(params.limit ?? 25, 100)
        const skip = (page - 1) * limit

        const skcWhere: Record<string, unknown> = {}
        if (params.productId) skcWhere.productId = params.productId
        if (params.categoryId || params.brandId) {
            skcWhere.product = {
                ...(params.categoryId ? { categoryId: params.categoryId } : {}),
                ...(params.brandId ? { brandId: params.brandId } : {}),
            }
        }

        const where: Record<string, unknown> = {}
        if (Object.keys(skcWhere).length > 0) where.skc = skcWhere
        if (params.isAvailable !== undefined) where.isAvailable = params.isAvailable

        if (params.search?.trim()) {
            const q = params.search.trim()
            where.OR = [
                { skuCode: { contains: q, mode: 'insensitive' } },
                { sizeLabel: { contains: q, mode: 'insensitive' } },
                { skc: { color: { name: { contains: q, mode: 'insensitive' } } } },
                { skc: { color: { code: { contains: q, mode: 'insensitive' } } } },
                { skc: { itemNumber: { contains: q, mode: 'insensitive' } } },
                { skc: { product: { name: { contains: q, mode: 'insensitive' } } } },
                { skc: { product: { productNumber: { contains: q, mode: 'insensitive' } } } },
            ]
        }

        const [total, rows] = await Promise.all([
            prisma.sKU.count({ where }),
            prisma.sKU.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ skc: { order: 'asc' } }, { order: 'asc' }],
                include: {
                    _count: { select: { productPrices: true } },
                    skc: {
                        select: {
                            id: true,
                            itemNumber: true,
                            attributes: true,
                            isAvailable: true,
                            color: { select: COLOR_SELECT },
                            images: {
                                where: { isPrimary: true },
                                take: 1,
                                select: { url: true },
                            },
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    productNumber: true,
                                    skuSpecKind: true,
                                    brandRef: { select: { name: true } },
                                    category: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            }),
        ])

        const data: SerializedSKUListItem[] = rows.map(row => ({
            id: row.id,
            skuCode: row.skuCode,
            sizeLabel: row.sizeLabel,
            isAvailable: row.isAvailable,
            isDefault: row.isDefault,
            order: row.order,
            priceCount: row._count.productPrices,
            skcId: row.skc.id,
            ...flatColorFields(row.skc.color),
            itemNumber: row.skc.itemNumber,
            attributes: parseSkcAttributes(row.skc.attributes),
            skcIsAvailable: row.skc.isAvailable,
            primaryImage: row.skc.images[0]?.url ? toDisplayUrl(row.skc.images[0].url) : null,
            productId: row.skc.product.id,
            productName: row.skc.product.name,
            productNumber: row.skc.product.productNumber,
            brandName: row.skc.product.brandRef?.name ?? null,
            categoryName: row.skc.product.category?.name ?? null,
            skuSpecKind: row.skc.product.skuSpecKind,
        }))

        const pages = Math.ceil(total / limit) || 1
        return {
            success: true as const,
            data,
            pagination: {
                page,
                limit,
                total,
                pages,
                hasPrev: page > 1,
                hasNext: page < pages,
            },
        }
    } catch (error) {
        console.error('getSKUsPaginated:', error)
        return { success: false as const, error: 'فشل جلب المقاسات' }
    }
}

export async function getSKUDetail(skuId: string) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: skuId },
            include: {
                productPrices: {
                    include: SKU_PRICE_INCLUDE,
                    orderBy: { createdAt: 'asc' },
                },
                skc: {
                    include: {
                        color: { select: COLOR_SELECT },
                        images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
                        skus: {
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                sizeLabel: true,
                                skuCode: true,
                                isAvailable: true,
                                isDefault: true,
                            },
                        },
                        product: {
                            include: {
                                brandRef: { select: { id: true, name: true, code: true } },
                                category: { select: { id: true, name: true, code: true } },
                                productUnits: {
                                    include: { unit: true },
                                    orderBy: { order: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
        })
        if (!sku) return { success: false as const, error: 'المقاس غير موجود' }

        const productUnits = serializeProductUnits(sku.skc.product.productUnits)
        const color = mapColorRef(sku.skc.color)
        const serialized = serializeSKU(sku, productUnits)

        const detail: SerializedSKUDetail = {
            ...serialized,
            skc: {
                id: sku.skc.id,
                itemNumber: sku.skc.itemNumber,
                attributes: parseSkcAttributes(sku.skc.attributes),
                color,
                ...flatColorFields(color),
                isAvailable: sku.skc.isAvailable,
                isDefault: sku.skc.isDefault,
                images: sku.skc.images.map(pi => ({
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
                siblingSkus: sku.skc.skus.map(s => ({
                    id: s.id,
                    sizeLabel: s.sizeLabel,
                    skuCode: s.skuCode,
                    isAvailable: s.isAvailable,
                    isDefault: s.isDefault,
                })),
            },
            product: {
                id: sku.skc.product.id,
                name: sku.skc.product.name,
                productNumber: sku.skc.product.productNumber,
                slug: sku.skc.product.slug,
                skuSpecKind: sku.skc.product.skuSpecKind,
                brandRef: sku.skc.product.brandRef,
                category: sku.skc.product.category,
                productUnits,
            },
        }

        return { success: true as const, data: detail }
    } catch (error) {
        console.error('getSKUDetail:', error)
        return { success: false as const, error: 'فشل جلب بيانات المقاس' }
    }
}

export async function getSKUById(skuId: string) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: skuId },
            include: {
                productPrices: {
                    include: SKU_PRICE_INCLUDE,
                    orderBy: { createdAt: 'asc' },
                },
                skc: {
                    select: {
                        productId: true,
                        product: {
                            include: {
                                productUnits: {
                                    include: { unit: true },
                                    orderBy: { order: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
        })
        if (!sku) return { success: false as const, error: 'المقاس غير موجود' }

        const productUnits = serializeProductUnits(sku.skc.product.productUnits)
        return {
            success: true as const,
            data: {
                ...serializeSKU(sku, productUnits),
                productUnits,
            },
        }
    } catch (error) {
        console.error('getSKUById:', error)
        return { success: false as const, error: 'فشل جلب بيانات المقاس' }
    }
}

export async function getSKUsByProductId(productId: string) {
    try {
        await requireAuth()
        const skus = await prisma.sKU.findMany({
            where: { skc: { productId } },
            include: {
                productPrices: {
                    include: SKU_PRICE_INCLUDE,
                    orderBy: { createdAt: 'asc' },
                },
                skc: { select: { id: true, color: { select: COLOR_SELECT } } },
            },
            orderBy: [{ skc: { order: 'asc' } }, { order: 'asc' }],
        })
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { productUnits: { include: { unit: true } } },
        })
        const units = serializeProductUnits(product?.productUnits ?? [])
        return {
            success: true as const,
            data: skus.map(s => ({
                ...serializeSKU(s, units),
                skc: {
                    id: s.skc.id,
                    ...flatColorFields(s.skc.color),
                },
            })),
        }
    } catch (error) {
        return { success: false as const, error: 'فشل جلب المقاسات' }
    }
}
