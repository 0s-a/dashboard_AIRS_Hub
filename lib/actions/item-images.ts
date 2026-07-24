'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { uploadProductImage, deleteProductImage as deleteImageFile } from './upload'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'
import { requireAuth } from '@/lib/auth-utils'
import { revalidateItem } from '@/lib/actions/items/_shared'

export type ItemImageRecord = {
    id: string
    url: string
    filename: string
    alt: string | null
    isPrimary: boolean
    order: number
    width: number | null
    height: number | null
    sizeBytes: number | null
    itemId: string
}

async function revalidateItemImages(itemId: string) {
    revalidateItem(itemId)
    revalidatePath('/gallery')
}

function mapRecord(ii: {
    id: string
    url: string
    filename: string
    alt: string | null
    isPrimary: boolean
    order: number
    width: number | null
    height: number | null
    sizeBytes: number | null
    itemId: string
}): ItemImageRecord {
    return {
        id: ii.id,
        url: toDisplayUrl(ii.url),
        filename: ii.filename,
        alt: ii.alt,
        isPrimary: ii.isPrimary,
        order: ii.order,
        width: ii.width,
        height: ii.height,
        sizeBytes: ii.sizeBytes,
        itemId: ii.itemId,
    }
}

export async function getItemImages(itemId: string): Promise<{ success: boolean; data: ItemImageRecord[]; error?: string }> {
    try {
        await requireAuth()
        const images = await prisma.itemImage.findMany({
            where: { itemId },
            orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
        })
        return { success: true, data: images.map(mapRecord) }
    } catch (error) {
        console.error('Failed to get item images:', error)
        return { success: false, data: [], error: 'فشل جلب الصور' }
    }
}

export async function addItemImage(
    itemId: string,
    file: File
): Promise<{ success: boolean; data?: ItemImageRecord; error?: string }> {
    try {
        await requireAuth()
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { id: true, itemNumber: true },
        })
        if (!item) return { success: false, error: 'الصنف غير موجود' }

        const folderKey = item.itemNumber || item.id
        const existingCount = await prisma.itemImage.count({ where: { itemId } })
        if (existingCount >= IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct) {
            return { success: false, error: `الحد الأقصى ${IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct} صور للصنف` }
        }

        const maxOrderRow = await prisma.itemImage.findFirst({
            where: { itemId },
            orderBy: { order: 'desc' },
            select: { order: true },
        })
        const nextOrder = (maxOrderRow?.order ?? -1) + 1

        const result = await uploadProductImage(file, folderKey)
        if (!result.success || !result.url) {
            return { success: false, error: result.error || 'فشل رفع الصورة' }
        }

        const image = await prisma.itemImage.create({
            data: {
                itemId,
                url: result.url,
                filename: result.filename!,
                sizeBytes: result.sizeBytes ?? null,
                width: result.width ?? null,
                height: result.height ?? null,
                isPrimary: existingCount === 0,
                order: nextOrder,
            },
        })

        await revalidateItemImages(itemId)
        return { success: true, data: mapRecord(image) }
    } catch (error) {
        console.error('Failed to add item image:', error)
        return { success: false, error: 'فشل إضافة الصورة' }
    }
}

export async function removeItemImage(itemImageId: string) {
    try {
        await requireAuth()
        const image = await prisma.itemImage.findUnique({
            where: { id: itemImageId },
            select: { id: true, itemId: true, url: true, isPrimary: true },
        })
        if (!image) return { success: false, error: 'الصورة غير موجودة' }

        const { itemId, isPrimary: wasPrimary } = image
        await deleteImageFile(image.url)
        await prisma.itemImage.delete({ where: { id: itemImageId } })

        if (wasPrimary) {
            const first = await prisma.itemImage.findFirst({
                where: { itemId },
                orderBy: { order: 'asc' },
            })
            if (first) {
                await prisma.itemImage.update({ where: { id: first.id }, data: { isPrimary: true } })
            }
        }

        await revalidateItemImages(itemId)
        return { success: true }
    } catch {
        return { success: false, error: 'فشل حذف الصورة' }
    }
}

export async function setPrimaryItemImage(itemImageId: string) {
    try {
        await requireAuth()
        const image = await prisma.itemImage.findUnique({
            where: { id: itemImageId },
            select: { id: true, itemId: true },
        })
        if (!image) return { success: false, error: 'الصورة غير موجودة' }

        await prisma.itemImage.updateMany({
            where: { itemId: image.itemId },
            data: { isPrimary: false },
        })
        await prisma.itemImage.update({
            where: { id: itemImageId },
            data: { isPrimary: true },
        })

        await revalidateItemImages(image.itemId)
        return { success: true }
    } catch {
        return { success: false, error: 'فشل تحديث الصورة الرئيسية' }
    }
}

export async function reorderItemImages(itemImageIds: string[]) {
    try {
        await requireAuth()
        await Promise.all(
            itemImageIds.map((id, index) =>
                prisma.itemImage.update({ where: { id }, data: { order: index } })
            )
        )
        if (itemImageIds.length > 0) {
            const first = await prisma.itemImage.findUnique({
                where: { id: itemImageIds[0] },
                select: { itemId: true },
            })
            if (first) await revalidateItemImages(first.itemId)
        }
        return { success: true }
    } catch {
        return { success: false, error: 'فشل إعادة ترتيب الصور' }
    }
}
