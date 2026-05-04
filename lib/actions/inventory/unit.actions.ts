'use server'

import { prisma, serializeProduct, requireProduct, revalidateProduct } from './_shared'

// ─────────────────────────────────────────────────────────────
// PRODUCT UNITS — Which units a product is sold in
// ─────────────────────────────────────────────────────────────

/**
 * Replace all product units atomically.
 * Deletes existing and creates the new list in a single operation.
 */
export async function setProductUnits(
    productId: string,
    units: { unitId: string; isBase: boolean; conversionFactor?: number; barcode?: string }[]
) {
    try {
        // Replace in a transaction to keep data consistent
        await prisma.$transaction(async (tx) => {
            await tx.productUnit.deleteMany({ where: { productId } })
            if (units.length > 0) {
                await tx.productUnit.createMany({
                    data: units.map((u, idx) => ({
                        productId,
                        unitId:           u.unitId,
                        isBase:           u.isBase,
                        conversionFactor: u.conversionFactor ?? 1,
                        barcode:          u.barcode || null,
                        order:            idx,
                    })),
                })
            }
        })

        const product = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to set product units:', error)
        return { success: false, error: error?.message ?? 'فشل تحديث الوحدات' }
    }
}
