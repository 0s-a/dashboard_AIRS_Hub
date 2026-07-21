'use server'

import {
    prisma,
    serializeProduct,
    requireProduct,
    revalidateProductPricing,
    serializeProductUnits,
    PRODUCT_PRICE_INCLUDE,
} from './_shared'
import { requireAuth } from '@/lib/auth-utils'

async function afterPriceChange(productId: string) {
    revalidateProductPricing(productId)
}

export async function addProductPrice(productId: string, data: {
    priceLabelId: string
    unitId: string
    value: number
    isAutoCalculated?: boolean
}) {
    try {
        await requireAuth()
        if (isNaN(data.value) || data.value < 0) return { success: false, error: 'القيمة غير صحيحة' }
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (!data.unitId) return { success: false, error: 'الوحدة مطلوبة' }

        const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        await prisma.productPrice.create({
            data: {
                productId,
                priceLabelId: data.priceLabelId,
                unitId: data.unitId,
                value: data.value,
                isAutoCalculated: data.isAutoCalculated ?? false,
            },
        })

        await afterPriceChange(productId)
        const updated = await requireProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to add product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة السعر' }
    }
}

export async function updateProductPrice(priceId: string, data: {
    value?: number
    isAutoCalculated?: boolean
    priceLabelId?: string
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
                value: data.value,
                isAutoCalculated: data.isAutoCalculated,
                priceLabelId: data.priceLabelId,
                unitId: data.unitId,
            },
        })

        await afterPriceChange(existing.productId)
        const product = await requireProduct(existing.productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل تحديث السعر' }
    }
}

export async function deleteProductPrice(priceId: string) {
    try {
        await requireAuth()
        const existing = await prisma.productPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        const productId = existing.productId
        await prisma.productPrice.delete({ where: { id: priceId } })

        const remainingPricesCount = await prisma.productPrice.count({ where: { productId } })
        const remainingUnitsCount = await prisma.productUnit.count({ where: { productId } })

        if (remainingPricesCount === 0 || remainingUnitsCount === 0) {
            await prisma.product.update({
                where: { id: productId },
                data: { isAvailable: false },
            })
        }

        await afterPriceChange(productId)
        const product = await requireProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to delete product price:', error)
        return { success: false, error: error?.message ?? 'فشل حذف السعر' }
    }
}

export async function addProductPricesForAllUnits(productId: string, data: {
    priceLabelId: string
    basePriceValue: number
}) {
    try {
        await requireAuth()
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (isNaN(data.basePriceValue) || data.basePriceValue < 0) {
            return { success: false, error: 'السعر الأساسي غير صحيح' }
        }

        const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        const productUnits = await prisma.productUnit.findMany({
            where: { productId },
            include: { unit: true },
            orderBy: { order: 'asc' },
        })

        if (productUnits.length === 0) {
            return { success: false, error: 'أضف وحدات المنتج أولاً' }
        }

        for (const pu of productUnits) {
            const value = pu.isBase
                ? data.basePriceValue
                : data.basePriceValue * (pu.conversionFactor || 1)

            await prisma.productPrice.upsert({
                where: {
                    productId_priceLabelId_unitId: {
                        productId,
                        priceLabelId: data.priceLabelId,
                        unitId: pu.unitId,
                    },
                },
                create: {
                    productId,
                    priceLabelId: data.priceLabelId,
                    unitId: pu.unitId,
                    value,
                    isAutoCalculated: !pu.isBase,
                },
                update: {
                    value,
                    isAutoCalculated: !pu.isBase,
                },
            })
        }

        await afterPriceChange(productId)
        const updated = await requireProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to add prices for all units:', error)
        if (error?.code === 'P2002') return { success: false, error: 'بعض الأسعار موجودة بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة الأسعار' }
    }
}

export async function copyPriceLabelPrices(
    productId: string,
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
            where: { productId, priceLabelId: fromLabelId },
        })

        if (sourcePrices.length === 0) {
            return { success: false, error: 'لا توجد أسعار في القائمة المصدر' }
        }

        const multiplier = 1 + adjustmentPercent / 100

        for (const sp of sourcePrices) {
            const newValue = Number(sp.value) * multiplier

            await prisma.productPrice.upsert({
                where: {
                    productId_priceLabelId_unitId: {
                        productId,
                        priceLabelId: toLabelId,
                        unitId: sp.unitId,
                    },
                },
                create: {
                    productId,
                    priceLabelId: toLabelId,
                    unitId: sp.unitId,
                    value: newValue,
                    isAutoCalculated: true,
                },
                update: {
                    value: newValue,
                    isAutoCalculated: true,
                },
            })
        }

        await afterPriceChange(productId)
        const product = await requireProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to copy price label prices:', error)
        return { success: false, error: error?.message ?? 'فشل نسخ الأسعار' }
    }
}

export async function getProductPrices(productId: string) {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                productPrices: { include: PRODUCT_PRICE_INCLUDE, orderBy: { createdAt: 'asc' } },
                productUnits: { include: { unit: true }, orderBy: { order: 'asc' } },
            },
        })
        if (!product) return { success: false, error: 'المنتج غير موجود' }
        return {
            success: true,
            data: {
                productId,
                productPrices: product.productPrices,
                productUnits: serializeProductUnits(product.productUnits),
            },
        }
    } catch (error) {
        return { success: false, error: 'فشل جلب الأسعار' }
    }
}
