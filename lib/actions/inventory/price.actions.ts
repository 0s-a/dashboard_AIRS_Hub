'use server'

import { prisma, serializeProduct, requireProduct, revalidateProduct } from './_shared'

// ─────────────────────────────────────────────────────────────
// PRODUCT PRICES — CRUD + Auto-Pricing + Copy
// ─────────────────────────────────────────────────────────────

/** Add a single price entry to a product */
export async function addProductPrice(productId: string, data: {
    priceLabelId: string
    currencyId: string
    unitId: string
    value: number
    isAutoCalculated?: boolean
}) {
    try {
        if (isNaN(data.value) || data.value < 0) return { success: false, error: 'القيمة غير صحيحة' }
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (!data.currencyId)   return { success: false, error: 'العملة مطلوبة' }
        if (!data.unitId)       return { success: false, error: 'الوحدة مطلوبة' }

        await prisma.productPrice.create({
            data: {
                productId,
                priceLabelId: data.priceLabelId,
                currencyId:   data.currencyId,
                unitId:       data.unitId,
                value:        data.value,
                isAutoCalculated: data.isAutoCalculated ?? false,
            },
        })

        const product = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to add product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + العملة + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة السعر' }
    }
}

/** Update an existing price entry */
export async function updateProductPrice(priceId: string, data: {
    value?: number
    isAutoCalculated?: boolean
    priceLabelId?: string
    currencyId?: string
    unitId?: string
}) {
    try {
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

        const product = await requireProduct(existing.productId)
        revalidateProduct(existing.productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + العملة + الوحدة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل تحديث السعر' }
    }
}

/** Delete a price entry */
export async function deleteProductPrice(priceId: string) {
    try {
        const existing = await prisma.productPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        await prisma.productPrice.delete({ where: { id: priceId } })

        const product = await requireProduct(existing.productId)
        revalidateProduct(existing.productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to delete product price:', error)
        return { success: false, error: error?.message ?? 'فشل حذف السعر' }
    }
}

/**
 * Smart pricing: add prices for ALL product units across multiple currencies.
 * Prices for non-base units are auto-calculated via their conversionFactor.
 */
export async function addProductPricesForAllUnits(productId: string, data: {
    priceLabelId: string
    currencies: Array<{
        currencyId: string
        basePriceValue: number  // price for the BASE unit in this currency
    }>
}) {
    try {
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (!data.currencies.length) return { success: false, error: 'حدد عملة واحدة على الأقل' }

        for (const cur of data.currencies) {
            if (isNaN(cur.basePriceValue) || cur.basePriceValue < 0) {
                return { success: false, error: 'أحد الأسعار الأساسية غير صحيح' }
            }
        }

        const productUnits = await prisma.productUnit.findMany({
            where: { productId },
            include: { unit: true },
            orderBy: { order: 'asc' },
        })

        if (productUnits.length === 0) {
            return { success: false, error: 'أضف وحدات المنتج أولاً' }
        }

        // Upsert for each (currency × unit) combination
        for (const cur of data.currencies) {
            for (const pu of productUnits) {
                const value = pu.isBase
                    ? cur.basePriceValue
                    : cur.basePriceValue * (pu.conversionFactor || 1)

                await prisma.productPrice.upsert({
                    where: {
                        productId_priceLabelId_currencyId_unitId: {
                            productId,
                            priceLabelId: data.priceLabelId,
                            currencyId:   cur.currencyId,
                            unitId:       pu.unitId,
                        },
                    },
                    create: {
                        productId,
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

        const product = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to add prices for all units:', error)
        if (error?.code === 'P2002') return { success: false, error: 'بعض الأسعار موجودة بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة الأسعار' }
    }
}

/**
 * Copy all prices from one PriceLabel to another for a given product.
 * @param adjustmentPercent - e.g. 20 means ×1.2 (+20%); -10 means ×0.9
 */
export async function copyPriceLabelPrices(
    productId: string,
    fromLabelId: string,
    toLabelId: string,
    adjustmentPercent: number = 0
) {
    try {
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
                    productId_priceLabelId_currencyId_unitId: {
                        productId,
                        priceLabelId: toLabelId,
                        currencyId:   sp.currencyId,
                        unitId:       sp.unitId,
                    },
                },
                create: {
                    productId,
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

        const product = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to copy price label prices:', error)
        return { success: false, error: error?.message ?? 'فشل نسخ الأسعار' }
    }
}
