'use server'

import { prisma, serializeProduct, requireProduct, revalidateProduct } from './_shared'
import { upsertProductToMeilisearch } from '@/lib/utils/meilisearch-sync'
import { requireAuth } from '@/lib/auth-utils'

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
        await requireAuth()
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
            } else {
                await tx.product.update({
                    where: { id: productId },
                    data: { isAvailable: false },
                })
            }
        })

        const product = await requireProduct(productId)
        revalidateProduct(productId)
        upsertProductToMeilisearch(productId).catch(console.warn)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to set product units:', error)
        return { success: false, error: error?.message ?? 'فشل تحديث الوحدات' }
    }
}
