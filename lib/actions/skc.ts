'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import {
    SKC_DETAIL_INCLUDE,
    serializeSKC,
    serializeProductUnits,
    revalidateSkc,
    revalidateSku,
    revalidateAllSkusForSkc,
    buildSkuCode,
    getDefaultColorId,
    COLOR_SELECT,
} from '@/lib/actions/inventory/_shared'
import type { SerializedSKCDetail, SerializedSKCListItem, SkcInput } from '@/lib/types/skc'
import { flatColorFields } from '@/lib/types/skc'
import { upsertProductToMeilisearch } from '@/lib/utils/meilisearch-sync'
import { normalizeSkcAttributes, parseSkcAttributes } from '@/lib/utils/skc-attributes'
import { Prisma } from '@prisma/client'

async function getAllowedAttributeCodes(): Promise<Set<string>> {
    const rows = await prisma.productAttribute.findMany({ select: { code: true } })
    return new Set(rows.map(r => r.code.toUpperCase()))
}

function attributesToPrismaJson(attributes: ReturnType<typeof normalizeSkcAttributes>): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    return attributes === null ? Prisma.JsonNull : attributes
}

async function createDefaultSku(
    skcId: string,
    productNumber: string,
    colorCode: string,
    sizeLabel: string | null = null,
    isDefault = true,
    tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
) {
    const db = tx ?? prisma
    const label = sizeLabel?.trim() || null
    return db.sKU.create({
        data: {
            skcId,
            skuCode: buildSkuCode(productNumber, colorCode, label),
            sizeLabel: label,
            isDefault,
            order: 0,
        },
    })
}

export async function getSKCsPaginated(params: {
    page?: number
    limit?: number
    search?: string
    productId?: string
    categoryId?: string
    brandId?: string
    isAvailable?: boolean
    sortBy?: 'createdAt' | 'order'
    sortDir?: 'asc' | 'desc'
}) {
    try {
        await requireAuth()
        const page = params.page ?? 1
        const limit = Math.min(params.limit ?? 25, 100)
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = {}
        if (params.productId) where.productId = params.productId
        if (params.isAvailable !== undefined) where.isAvailable = params.isAvailable
        if (params.search?.trim()) {
            const q = params.search.trim()
            where.OR = [
                { color: { name: { contains: q, mode: 'insensitive' } } },
                { color: { code: { contains: q, mode: 'insensitive' } } },
                { itemNumber: { contains: q, mode: 'insensitive' } },
                { product: { name: { contains: q, mode: 'insensitive' } } },
                { product: { productNumber: { contains: q, mode: 'insensitive' } } },
                { skus: { some: { skuCode: { contains: q, mode: 'insensitive' } } } },
            ]
        }
        if (params.categoryId || params.brandId) {
            where.product = {
                ...(params.categoryId ? { categoryId: params.categoryId } : {}),
                ...(params.brandId ? { brandId: params.brandId } : {}),
            }
        }

        const orderBy = { [params.sortBy ?? 'order']: params.sortDir ?? 'asc' }

        const [total, rows] = await Promise.all([
            prisma.sKC.count({ where }),
            prisma.sKC.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
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
                            brandRef: { select: { name: true } },
                            category: { select: { name: true } },
                        },
                    },
                    _count: { select: { skus: true } },
                },
            }),
        ])

        const data: SerializedSKCListItem[] = rows.map(row => ({
            id: row.id,
            itemNumber: row.itemNumber,
            attributes: parseSkcAttributes(row.attributes),
            ...flatColorFields(row.color),
            isDefault: row.isDefault,
            isAvailable: row.isAvailable,
            order: row.order,
            productId: row.productId,
            productName: row.product.name,
            productNumber: row.product.productNumber,
            brandName: row.product.brandRef?.name ?? null,
            categoryName: row.product.category?.name ?? null,
            skuCount: row._count.skus,
            primaryImage: row.images[0]?.url ?? null,
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
        console.error('getSKCsPaginated:', error)
        return { success: false as const, error: 'فشل جلب الأصناف' }
    }
}

export async function getSKCById(skcId: string) {
    try {
        await requireAuth()
        const skc = await prisma.sKC.findUnique({
            where: { id: skcId },
            include: SKC_DETAIL_INCLUDE as any,
        }) as any
        if (!skc) return { success: false as const, error: 'الصنف غير موجود' }

        const productUnits = serializeProductUnits(skc.product.productUnits)
        const serialized = serializeSKC(skc, productUnits)
        const detail: SerializedSKCDetail = {
            ...serialized,
            product: {
                id: skc.product.id,
                name: skc.product.name,
                productNumber: skc.product.productNumber,
                slug: skc.product.slug,
                brandRef: skc.product.brandRef,
                category: skc.product.category,
                productUnits,
            },
        }
        return { success: true as const, data: detail }
    } catch (error) {
        console.error('getSKCById:', error)
        return { success: false as const, error: 'فشل جلب بيانات الصنف' }
    }
}

export async function addSKC(data: SkcInput) {
    try {
        await requireAuth()
        if (!data.colorId) return { success: false, error: 'اختر اللون' }

        const [product, color] = await Promise.all([
            prisma.product.findUnique({
                where: { id: data.productId },
                select: { id: true, productNumber: true },
            }),
            prisma.color.findUnique({
                where: { id: data.colorId },
                select: { id: true, code: true, isActive: true },
            }),
        ])
        if (!product) return { success: false, error: 'المنتج غير موجود' }
        if (!color) return { success: false, error: 'اللون غير موجود' }
        if (!color.isActive) return { success: false, error: 'اللون غير نشط' }

        const existing = await prisma.sKC.findFirst({
            where: { productId: data.productId, colorId: data.colorId },
        })
        if (existing) return { success: false, error: 'هذا اللون مستخدم بالفعل لهذا المنتج' }

        const count = await prisma.sKC.count({ where: { productId: data.productId } })
        let attributes: ReturnType<typeof normalizeSkcAttributes> = null
        if (data.attributes !== undefined && data.attributes !== null) {
            const allowed = await getAllowedAttributeCodes()
            attributes = normalizeSkcAttributes(data.attributes, allowed)
        }

        const { skc, sku } = await prisma.$transaction(async (tx) => {
            const created = await tx.sKC.create({
                data: {
                    productId: data.productId,
                    colorId: data.colorId,
                    itemNumber: data.itemNumber?.trim() || null,
                    attributes: attributesToPrismaJson(attributes),
                    isDefault: data.isDefault ?? count === 0,
                    order: count,
                },
            })
            const defaultSku = await createDefaultSku(
                created.id,
                product.productNumber,
                color.code,
                data.sizeLabel?.trim() || null,
                true,
                tx
            )
            return { skc: created, sku: defaultSku }
        })

        revalidateSku(sku.id, data.productId)
        revalidateSkc(skc.id, data.productId)
        upsertProductToMeilisearch(data.productId).catch(console.warn)
        return { success: true, data: { id: skc.id, skuId: sku.id } }
    } catch (error: any) {
        console.error('addSKC:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الصنف' }
    }
}

export async function addSKCsBatch(productId: string, colorIds: string[]) {
    try {
        await requireAuth()

        const uniqueColorIds = [...new Set(colorIds.filter(Boolean))]
        if (uniqueColorIds.length === 0) {
            return { success: true, data: { created: 0, skipped: 0 } }
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, productNumber: true },
        })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        const colors = await prisma.color.findMany({
            where: { id: { in: uniqueColorIds } },
            select: { id: true, code: true, isActive: true },
        })

        const colorMap = new Map(colors.map(c => [c.id, c]))
        const invalidIds = uniqueColorIds.filter(id => !colorMap.has(id))
        if (invalidIds.length > 0) {
            return { success: false, error: 'أحد الألوان المحددة غير موجود' }
        }

        const inactive = colors.filter(c => !c.isActive)
        if (inactive.length > 0) {
            return { success: false, error: 'أحد الألوان المحددة غير نشط' }
        }

        const existing = await prisma.sKC.findMany({
            where: { productId, colorId: { in: uniqueColorIds } },
            select: { colorId: true },
        })
        const existingColorIds = new Set(existing.map(e => e.colorId))
        const toCreate = uniqueColorIds.filter(id => !existingColorIds.has(id))
        const skipped = uniqueColorIds.length - toCreate.length

        if (toCreate.length === 0) {
            return { success: true, data: { created: 0, skipped } }
        }

        const baseCount = await prisma.sKC.count({ where: { productId } })
        const hasDefault = baseCount > 0
            ? await prisma.sKC.count({ where: { productId, isDefault: true } }) > 0
            : false

        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < toCreate.length; i++) {
                const colorId = toCreate[i]
                const color = colorMap.get(colorId)!
                const order = baseCount + i
                const isDefault = !hasDefault && i === 0

                const skc = await tx.sKC.create({
                    data: {
                        productId,
                        colorId,
                        isDefault,
                        order,
                    },
                })
                await createDefaultSku(skc.id, product.productNumber, color.code, null, true, tx)
            }
        })

        revalidatePath('/products')
        revalidatePath('/items')
        revalidatePath('/inventory')
        upsertProductToMeilisearch(productId).catch(console.warn)

        return { success: true, data: { created: toCreate.length, skipped } }
    } catch (error: any) {
        console.error('addSKCsBatch:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الأصناف' }
    }
}

export async function updateSKC(
    skcId: string,
    data: Partial<Pick<SkcInput, 'colorId' | 'itemNumber' | 'attributes'>> & { isAvailable?: boolean; isDefault?: boolean }
) {
    try {
        await requireAuth()
        const skc = await prisma.sKC.findUnique({
            where: { id: skcId },
            include: {
                product: { select: { productNumber: true } },
                color: { select: { code: true } },
                skus: true,
            },
        })
        if (!skc) return { success: false, error: 'الصنف غير موجود' }

        let newColorCode = skc.color.code
        if (data.colorId && data.colorId !== skc.colorId) {
            const color = await prisma.color.findUnique({
                where: { id: data.colorId },
                select: { id: true, code: true, isActive: true },
            })
            if (!color) return { success: false, error: 'اللون غير موجود' }
            if (!color.isActive) return { success: false, error: 'اللون غير نشط' }
            const dup = await prisma.sKC.findFirst({
                where: { productId: skc.productId, colorId: data.colorId, NOT: { id: skcId } },
            })
            if (dup) return { success: false, error: 'هذا اللون مستخدم بالفعل لهذا المنتج' }
            newColorCode = color.code
        }

        let attributesUpdate: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined
        if (data.attributes !== undefined) {
            const allowed = await getAllowedAttributeCodes()
            attributesUpdate = attributesToPrismaJson(normalizeSkcAttributes(data.attributes, allowed))
        }

        await prisma.$transaction(async (tx) => {
            await tx.sKC.update({
                where: { id: skcId },
                data: {
                    colorId: data.colorId ?? undefined,
                    itemNumber: data.itemNumber !== undefined ? (data.itemNumber?.trim() || null) : undefined,
                    ...(attributesUpdate !== undefined ? { attributes: attributesUpdate } : {}),
                    isAvailable: data.isAvailable,
                    isDefault: data.isDefault,
                },
            })
            if (newColorCode !== skc.color.code) {
                for (const sku of skc.skus) {
                    await tx.sKU.update({
                        where: { id: sku.id },
                        data: { skuCode: buildSkuCode(skc.product.productNumber, newColorCode, sku.sizeLabel) },
                    })
                }
            }
        })

        await revalidateAllSkusForSkc(skcId, skc.productId)
        upsertProductToMeilisearch(skc.productId).catch(console.warn)
        return { success: true }
    } catch (error: any) {
        console.error('updateSKC:', error)
        return { success: false, error: error?.message ?? 'فشل تحديث الصنف' }
    }
}

export async function removeSKC(skcId: string) {
    try {
        await requireAuth()
        const skc = await prisma.sKC.findUnique({ where: { id: skcId }, select: { productId: true } })
        if (!skc) return { success: false, error: 'الصنف غير موجود' }

        await prisma.sKC.delete({ where: { id: skcId } })
        revalidateSkc(skcId, skc.productId)
        upsertProductToMeilisearch(skc.productId).catch(console.warn)
        return { success: true }
    } catch (error) {
        console.error('removeSKC:', error)
        return { success: false, error: 'فشل حذف الصنف' }
    }
}

export async function toggleSkcAvailability(skcId: string, current: boolean) {
    try {
        await requireAuth()
        const skc = await prisma.sKC.update({
            where: { id: skcId },
            data: { isAvailable: !current },
            select: { productId: true, skus: { select: { id: true } } },
        })
        await revalidateAllSkusForSkc(skcId, skc.productId)
        upsertProductToMeilisearch(skc.productId).catch(console.warn)
        return { success: true, data: { isAvailable: !current } }
    } catch (error) {
        return { success: false, error: 'فشل تحديث التوفر' }
    }
}

export async function reorderSKCs(orderedIds: string[]) {
    try {
        await requireAuth()
        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.sKC.update({ where: { id }, data: { order: index } })
            )
        )
        revalidatePath('/items')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'فشل إعادة الترتيب' }
    }
}

export async function createDefaultSkcForProduct(
    productId: string,
    productNumber: string,
    tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
) {
    const db = tx ?? prisma
    const colorId = await getDefaultColorId(db)
    const color = await db.color.findUniqueOrThrow({ where: { id: colorId }, select: { code: true } })
    const skc = await db.sKC.create({
        data: {
            productId,
            colorId,
            isDefault: true,
            order: 0,
        },
    })
    await db.sKU.create({
        data: {
            skcId: skc.id,
            skuCode: buildSkuCode(productNumber, color.code),
            isDefault: true,
            order: 0,
        },
    })
    return skc
}
