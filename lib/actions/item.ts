'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { addSKC, updateSKC, removeSKC } from '@/lib/actions/skc'
import {
    addSKU,
    updateSKU,
    removeSKU,
    toggleSkuAvailability,
    getSKUsPaginated,
    getSKUDetail,
} from '@/lib/actions/sku'
import { revalidateItem } from '@/lib/actions/inventory/_shared'
import type { ItemInput, ItemUpdateInput } from '@/lib/types/item'
import { mapItemDetail, mapListItem } from '@/lib/types/item'

type ItemActionFailure = { success: false; error: string }
type CreateItemSuccess = { success: true; data: { id: string } }
export type CreateItemResult = CreateItemSuccess | ItemActionFailure

function itemActionError(error?: string, fallback = 'فشل العملية'): ItemActionFailure {
    return { success: false, error: error || fallback }
}

export async function createItem(data: ItemInput): Promise<CreateItemResult> {
    try {
        await requireAuth()
        if (!data.productId || !data.colorId) {
            return itemActionError('اختر المنتج واللون')
        }

        const existingSkc = await prisma.sKC.findFirst({
            where: { productId: data.productId, colorId: data.colorId },
            select: { id: true },
        })

        if (existingSkc) {
            const skuRes = await addSKU({
                skcId: existingSkc.id,
                sizeLabel: data.sizeLabel?.trim() || null,
            })
            if (!skuRes.success) return itemActionError(skuRes.error, 'فشل إضافة الصنف')

            if (data.itemNumber !== undefined || data.attributes !== undefined) {
                const skcRes = await updateSKC(existingSkc.id, {
                    itemNumber: data.itemNumber,
                    attributes: data.attributes,
                })
                if (!skcRes.success) return itemActionError(skcRes.error, 'فشل تحديث بيانات اللون')
            }

            revalidateItem(skuRes.data!.id, data.productId)
            return { success: true, data: { id: skuRes.data!.id } }
        }

        const skcRes = await addSKC({
            productId: data.productId,
            colorId: data.colorId,
            itemNumber: data.itemNumber?.trim() || null,
            sizeLabel: data.sizeLabel?.trim() || null,
            attributes: data.attributes,
        })
        if (!skcRes.success) return itemActionError(skcRes.error, 'فشل إضافة الصنف')
        if (!skcRes.data?.skuId) return itemActionError(undefined, 'فشل إضافة الصنف')

        revalidateItem(skcRes.data.skuId, data.productId)
        return { success: true, data: { id: skcRes.data.skuId } }
    } catch (error: unknown) {
        console.error('createItem:', error)
        return itemActionError(undefined, 'فشل إضافة الصنف')
    }
}

export async function updateItem(itemId: string, data: ItemUpdateInput) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: itemId },
            select: { skcId: true, skc: { select: { productId: true, colorId: true } } },
        })
        if (!sku) return { success: false as const, error: 'الصنف غير موجود' }

        const skuFields: Parameters<typeof updateSKU>[1] = {}
        if (data.sizeLabel !== undefined) skuFields.sizeLabel = data.sizeLabel
        if (data.isAvailable !== undefined) skuFields.isAvailable = data.isAvailable

        if (Object.keys(skuFields).length > 0) {
            const skuRes = await updateSKU(itemId, skuFields)
            if (!skuRes.success) return skuRes
        }

        const skcFields: Parameters<typeof updateSKC>[1] = {}
        if (data.colorId !== undefined) skcFields.colorId = data.colorId
        if (data.itemNumber !== undefined) skcFields.itemNumber = data.itemNumber
        if (data.attributes !== undefined) skcFields.attributes = data.attributes

        if (Object.keys(skcFields).length > 0) {
            const skcRes = await updateSKC(sku.skcId, skcFields)
            if (!skcRes.success) return skcRes
        }

        revalidateItem(itemId, sku.skc.productId)
        return { success: true as const }
    } catch (error: unknown) {
        console.error('updateItem:', error)
        return { success: false as const, error: 'فشل تحديث الصنف' }
    }
}

export async function deleteItem(itemId: string) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: itemId },
            select: { skcId: true, skc: { select: { productId: true } } },
        })
        if (!sku) return { success: false as const, error: 'الصنف غير موجود' }

        const remaining = await prisma.sKU.count({ where: { skcId: sku.skcId } })

        if (remaining <= 1) {
            const res = await removeSKC(sku.skcId)
            if (!res.success) return res
        } else {
            const res = await removeSKU(itemId)
            if (!res.success) return res
        }

        revalidateItem(itemId, sku.skc.productId)
        return { success: true as const }
    } catch (error: unknown) {
        console.error('deleteItem:', error)
        return { success: false as const, error: 'فشل حذف الصنف' }
    }
}

export async function toggleItemAvailability(itemId: string, current: boolean) {
    try {
        await requireAuth()
        const sku = await prisma.sKU.findUnique({
            where: { id: itemId },
            select: { skc: { select: { isAvailable: true, productId: true } } },
        })
        if (!sku) return { success: false as const, error: 'الصنف غير موجود' }
        if (!sku.skc.isAvailable) {
            return { success: false as const, error: 'اللون غير متوفر — لا يمكن تفعيل هذا الصنف' }
        }

        const res = await toggleSkuAvailability(itemId, current)
        if (!res.success) return res

        revalidateItem(itemId, sku.skc.productId)
        return res
    } catch (error: unknown) {
        console.error('toggleItemAvailability:', error)
        return { success: false as const, error: 'فشل تحديث التوفر' }
    }
}

export async function getItemsPaginated(params: Parameters<typeof getSKUsPaginated>[0]) {
    const res = await getSKUsPaginated(params)
    if (!res.success) return res
    return {
        success: true as const,
        data: res.data.map(mapListItem),
        pagination: res.pagination,
    }
}

export async function getItemDetail(itemId: string) {
    const res = await getSKUDetail(itemId)
    if (!res.success) return res
    return { success: true as const, data: mapItemDetail(res.data) }
}

/** إضافة مقاس لنفس اللون — createItem مع product+color محددين */
export async function addSiblingItem(
    productId: string,
    colorId: string,
    sizeLabel?: string | null
): Promise<CreateItemResult> {
    return createItem({ productId, colorId, sizeLabel })
}
