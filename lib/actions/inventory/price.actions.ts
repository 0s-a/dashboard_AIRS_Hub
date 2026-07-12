'use server'

import {
    prisma,
    serializeProduct,
    requireProduct,
    revalidateProduct,
    revalidateSkc,
    revalidateSku,
    getProductIdFromSkuId,
    SKU_INCLUDE,
    serializeSKU,
    serializeProductUnits,
} from './_shared'
import { upsertProductToMeilisearch } from '@/lib/utils/meilisearch-sync'
import { requireAuth } from '@/lib/auth-utils'

async function revalidateSkuPrice(skuId: string) {
    const productId = await getProductIdFromSkuId(skuId)
    if (!productId) return
    const sku = await prisma.sKU.findUnique({ where: { id: skuId }, select: { skcId: true } })
    if (sku) revalidateSkc(sku.skcId, productId)
    revalidateSku(skuId, productId)
    revalidateProduct(productId)
    upsertProductToMeilisearch(productId).catch(console.warn)
}

/** Add a single price entry to a SKU */
export async function addProductPrice(skuId: string, data: {
    priceLabelId: string
    currencyId: string
    unitId: string
    value: number
    isAutoCalculated?: boolean
}) {
    try {
        await requireAuth()
        if (isNaN(data.value) || data.value < 0) return { success: false, error: 'القيمة غير صحيحة' }
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (!data.currencyId)   return { success: false, error: 'العملة مطلوبة' }
        if (!data.unitId)       return { success: false, error: 'الوحدة مطلوبة' }

        const sku = await prisma.sKU.findUnique({ where: { id: skuId }, select: { id: true } })
        if (!sku) return { success: false, error: 'المقاس غير موجود' }

        await prisma.productPrice.create({
            data: {
                skuId,
                priceLabelId: data.priceLabelId,
                currencyId:   data.currencyId,
                unitId:       data.unitId,
                value:        data.value,
                isAutoCalculated: data.isAutoCalculated ?? false,
            },
        })

        await revalidateSkuPrice(skuId)
        const productId = await getProductIdFromSkuId(skuId)
        if (productId) {
            const product = await requireProduct(productId)
            return { success: true, data: serializeProduct(product) }
        }
        return { success: true }
    } catch (error: any) {
        console.error('Failed to add product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + العملة + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة السعر' }
    }
}

export async function updateProductPrice(priceId: string, data: {
    value?: number
    isAutoCalculated?: boolean
    priceLabelId?: string
    currencyId?: string
    unitId?: string
}) {
    try {
        await requireAuth()
        if (data.value !== undefined && (isNaN(data.value) || data.value < 0)) {
            return { success: false, error: 'القيمة غير صحيحة' }
        }

        const existing = await prisma.productPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        await prisma.productPrice.update({
            where: { id: priceId },
            data: {
                value:           data.value,
                isAutoCalculated: data.isAutoCalculated,
                priceLabelId:    data.priceLabelId,
                currencyId:      data.currencyId,
                unitId:          data.unitId,
            },
        })

        await revalidateSkuPrice(existing.skuId)
        const productId = await getProductIdFromSkuId(existing.skuId)
        if (productId) {
            const product = await requireProduct(productId)
            return { success: true, data: serializeProduct(product) }
        }
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + العملة + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل تحديث السعر' }
    }
}

export async function deleteProductPrice(priceId: string) {
    try {
        await requireAuth()
        const existing = await prisma.productPrice.findUnique({
            where: { id: priceId },
            include: { sku: { select: { skc: { select: { productId: true } } } } },
        })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        const productId = existing.sku.skc.productId
        await prisma.productPrice.delete({ where: { id: priceId } })

        const remainingPricesCount = await prisma.productPrice.count({
            where: { sku: { skc: { productId } } },
        })
        const remainingUnitsCount = await prisma.productUnit.count({ where: { productId } })

        if (remainingPricesCount === 0 || remainingUnitsCount === 0) {
            await prisma.sKC.updateMany({
                where: { productId },
                data: { isAvailable: false },
            })
        }

        await revalidateSkuPrice(existing.skuId)
        const product = await requireProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to delete product price:', error)
        return { success: false, error: error?.message ?? 'فشل حذف السعر' }
    }
}

export async function addProductPricesForAllUnits(skuId: string, data: {
    priceLabelId: string
    currencies: Array<{ currencyId: string; basePriceValue: number }>
}) {
    try {
        await requireAuth()
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (!data.currencies.length) return { success: false, error: 'حدد عملة واحدة على الأقل' }

        for (const cur of data.currencies) {
            if (isNaN(cur.basePriceValue) || cur.basePriceValue < 0) {
                return { success: false, error: 'أحد الأسعار الأساسية غير صحيح' }
            }
        }

        const sku = await prisma.sKU.findUnique({
            where: { id: skuId },
            include: { skc: { select: { productId: true } } },
        })
        if (!sku) return { success: false, error: 'المقاس غير موجود' }

        const productUnits = await prisma.productUnit.findMany({
            where: { productId: sku.skc.productId },
            include: { unit: true },
            orderBy: { order: 'asc' },
        })

        if (productUnits.length === 0) {
            return { success: false, error: 'أضف وحدات المنتج أولاً' }
        }

        for (const cur of data.currencies) {
            for (const pu of productUnits) {
                const value = pu.isBase
                    ? cur.basePriceValue
                    : cur.basePriceValue * (pu.conversionFactor || 1)

                await prisma.productPrice.upsert({
                    where: {
                        skuId_priceLabelId_currencyId_unitId: {
                            skuId,
                            priceLabelId: data.priceLabelId,
                            currencyId:   cur.currencyId,
                            unitId:       pu.unitId,
                        },
                    },
                    create: {
                        skuId,
                        priceLabelId:     data.priceLabelId,
                        currencyId:       cur.currencyId,
                        unitId:           pu.unitId,
                        value,
                        isAutoCalculated: !pu.isBase,
                    },
                    update: {
                        value,
                        isAutoCalculated: !pu.isBase,
                    },
                })
            }
        }

        await revalidateSkuPrice(skuId)
        const product = await requireProduct(sku.skc.productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to add prices for all units:', error)
        if (error?.code === 'P2002') return { success: false, error: 'بعض الأسعار موجودة بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة الأسعار' }
    }
}

export async function copyPriceLabelPrices(
    skuId: string,
    fromLabelId: string,
    toLabelId: string,
    adjustmentPercent: number = 0
) {
    try {
        await requireAuth()
        if (fromLabelId === toLabelId) {
            return { success: false, error: 'القائمة المصدر والهدف نفس القائمة' }
        }

        const sourcePrices = await prisma.productPrice.findMany({
            where: { skuId, priceLabelId: fromLabelId },
        })

        if (sourcePrices.length === 0) {
            return { success: false, error: 'لا توجد أسعار في القائمة المصدر' }
        }

        const multiplier = 1 + adjustmentPercent / 100

        for (const sp of sourcePrices) {
            const newValue = Number(sp.value) * multiplier

            await prisma.productPrice.upsert({
                where: {
                    skuId_priceLabelId_currencyId_unitId: {
                        skuId,
                        priceLabelId: toLabelId,
                        currencyId:   sp.currencyId,
                        unitId:       sp.unitId,
                    },
                },
                create: {
                    skuId,
                    priceLabelId:     toLabelId,
                    currencyId:       sp.currencyId,
                    unitId:           sp.unitId,
                    value:            newValue,
                    isAutoCalculated: true,
                },
                update: {
                    value:            newValue,
                    isAutoCalculated: true,
                },
            })
        }

        await revalidateSkuPrice(skuId)
        const productId = await getProductIdFromSkuId(skuId)
        if (productId) {
            const product = await requireProduct(productId)
            return { success: true, data: serializeProduct(product) }
        }
        return { success: true }
    } catch (error: any) {
        console.error('Failed to copy price label prices:', error)
        return { success: false, error: error?.message ?? 'فشل نسخ الأسعار' }
    }
}

export async function getSkuPrices(skuId: string) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: skuId },
            include: {
                ...SKU_INCLUDE.include,
                skc: {
                    include: {
                        product: { include: { productUnits: { include: { unit: true } } } },
                    },
                },
            },
        })
        if (!sku) return { success: false, error: 'المقاس غير موجود' }
        const units = serializeProductUnits(sku.skc.product.productUnits)
        return { success: true, data: serializeSKU(sku, units) }
    } catch (error) {
        return { success: false, error: 'فشل جلب الأسعار' }
    }
}
