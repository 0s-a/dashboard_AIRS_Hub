'use server'

import { prisma, serializeItem, requireItem, revalidateItem } from './_shared'
import { upsertItemToMeilisearch } from '@/lib/utils/meilisearch-sync'
import { requireAuth } from '@/lib/auth-utils'

/**
 * Replace all item units atomically.
 * Deletes existing and creates the new list in a single operation.
 */
export async function setItemUnits(
    itemId: string,
    units: { unitId: string; isBase: boolean; conversionFactor?: number; barcode?: string }[]
) {
    try {
        await requireAuth()
        await prisma.$transaction(async (tx) => {
            await tx.itemUnit.deleteMany({ where: { itemId } })
            if (units.length > 0) {
                await tx.itemUnit.createMany({
                    data: units.map((u, idx) => ({
                        itemId,
                        unitId:           u.unitId,
                        isBase:           u.isBase,
                        conversionFactor: u.conversionFactor ?? 1,
                        barcode:          u.barcode || null,
                        order:            idx,
                    })),
                })
            } else {
                await tx.item.update({
                    where: { id: itemId },
                    data: { isAvailable: false },
                })
            }
        })

        const item = await requireItem(itemId)
        revalidateItem(itemId)
        upsertItemToMeilisearch(itemId).catch(console.warn)
        return { success: true, data: serializeItem(item) }
    } catch (error: any) {
        console.error('Failed to set item units:', error)
        return { success: false, error: error?.message ?? 'فشل تحديث الوحدات' }
    }
}
