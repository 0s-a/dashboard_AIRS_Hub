'use server'

import {
    prisma,
    serializeItem,
    requireItem,
    revalidateItemPricing,
    serializeItemUnits,
    ITEM_PRICE_INCLUDE,
} from './_shared'
import { requireAuth } from '@/lib/auth-utils'

async function afterPriceChange(itemId: string) {
    revalidateItemPricing(itemId)
}

export async function addItemPrice(itemId: string, data: {
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

        const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } })
        if (!item) return { success: false, error: 'الصنف غير موجود' }

        await prisma.itemPrice.create({
            data: {
                itemId,
                priceLabelId: data.priceLabelId,
                unitId: data.unitId,
                value: data.value,
                isAutoCalculated: data.isAutoCalculated ?? false,
            },
        })

        await afterPriceChange(itemId)
        const updated = await requireItem(itemId)
        return { success: true, data: serializeItem(updated) }
    } catch (error: any) {
        console.error('Failed to add item price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة السعر' }
    }
}

export async function updateItemPrice(priceId: string, data: {
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

        const existing = await prisma.itemPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        await prisma.itemPrice.update({
            where: { id: priceId },
            data: {
                value: data.value,
                isAutoCalculated: data.isAutoCalculated,
                priceLabelId: data.priceLabelId,
                unitId: data.unitId,
            },
        })

        await afterPriceChange(existing.itemId)
        const item = await requireItem(existing.itemId)
        return { success: true, data: serializeItem(item) }
    } catch (error: any) {
        console.error('Failed to update item price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل تحديث السعر' }
    }
}

export async function deleteItemPrice(priceId: string) {
    try {
        await requireAuth()
        const existing = await prisma.itemPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        const itemId = existing.itemId
        await prisma.itemPrice.delete({ where: { id: priceId } })

        const remainingPricesCount = await prisma.itemPrice.count({ where: { itemId } })
        const remainingUnitsCount = await prisma.itemUnit.count({ where: { itemId } })

        if (remainingPricesCount === 0 || remainingUnitsCount === 0) {
            await prisma.item.update({
                where: { id: itemId },
                data: { isAvailable: false },
            })
        }

        await afterPriceChange(itemId)
        const item = await requireItem(itemId)
        return { success: true, data: serializeItem(item) }
    } catch (error: any) {
        console.error('Failed to delete item price:', error)
        return { success: false, error: error?.message ?? 'فشل حذف السعر' }
    }
}

export async function addItemPricesForAllUnits(itemId: string, data: {
    priceLabelId: string
    basePriceValue: number
}) {
    try {
        await requireAuth()
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (isNaN(data.basePriceValue) || data.basePriceValue < 0) {
            return { success: false, error: 'السعر الأساسي غير صحيح' }
        }

        const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } })
        if (!item) return { success: false, error: 'الصنف غير موجود' }

        const itemUnits = await prisma.itemUnit.findMany({
            where: { itemId },
            include: { unit: true },
            orderBy: { order: 'asc' },
        })

        if (itemUnits.length === 0) {
            return { success: false, error: 'أضف وحدات الصنف أولاً' }
        }

        for (const iu of itemUnits) {
            const value = iu.isBase
                ? data.basePriceValue
                : data.basePriceValue * (iu.conversionFactor || 1)

            await prisma.itemPrice.upsert({
                where: {
                    itemId_priceLabelId_unitId: {
                        itemId,
                        priceLabelId: data.priceLabelId,
                        unitId: iu.unitId,
                    },
                },
                create: {
                    itemId,
                    priceLabelId: data.priceLabelId,
                    unitId: iu.unitId,
                    value,
                    isAutoCalculated: !iu.isBase,
                },
                update: {
                    value,
                    isAutoCalculated: !iu.isBase,
                },
            })
        }

        await afterPriceChange(itemId)
        const updated = await requireItem(itemId)
        return { success: true, data: serializeItem(updated) }
    } catch (error: any) {
        console.error('Failed to add prices for all units:', error)
        if (error?.code === 'P2002') return { success: false, error: 'بعض الأسعار موجودة بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة الأسعار' }
    }
}

export async function copyPriceLabelPrices(
    itemId: string,
    fromLabelId: string,
    toLabelId: string,
    adjustmentPercent: number = 0
) {
    try {
        await requireAuth()
        if (fromLabelId === toLabelId) {
            return { success: false, error: 'القائمة المصدر والهدف نفس القائمة' }
        }

        const sourcePrices = await prisma.itemPrice.findMany({
            where: { itemId, priceLabelId: fromLabelId },
        })

        if (sourcePrices.length === 0) {
            return { success: false, error: 'لا توجد أسعار في القائمة المصدر' }
        }

        const multiplier = 1 + adjustmentPercent / 100

        for (const sp of sourcePrices) {
            const newValue = Number(sp.value) * multiplier

            await prisma.itemPrice.upsert({
                where: {
                    itemId_priceLabelId_unitId: {
                        itemId,
                        priceLabelId: toLabelId,
                        unitId: sp.unitId,
                    },
                },
                create: {
                    itemId,
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

        await afterPriceChange(itemId)
        const item = await requireItem(itemId)
        return { success: true, data: serializeItem(item) }
    } catch (error: any) {
        console.error('Failed to copy price label prices:', error)
        return { success: false, error: error?.message ?? 'فشل نسخ الأسعار' }
    }
}

export async function getItemPrices(itemId: string) {
    try {
        await requireAuth()
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                itemPrices: { include: ITEM_PRICE_INCLUDE, orderBy: { createdAt: 'asc' } },
                itemUnits: { include: { unit: true }, orderBy: { order: 'asc' } },
            },
        })
        if (!item) return { success: false, error: 'الصنف غير موجود' }
        return {
            success: true,
            data: {
                itemId,
                itemPrices: item.itemPrices,
                itemUnits: serializeItemUnits(item.itemUnits),
            },
        }
    } catch (error) {
        return { success: false, error: 'فشل جلب الأسعار' }
    }
}
