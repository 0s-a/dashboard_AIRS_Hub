'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { uploadProductImage, deleteProductImage as deleteImageFile } from './upload'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'
import { requireAuth } from '@/lib/auth-utils'
import { revalidateProduct } from '@/lib/actions/inventory/_shared'

export type ProductImageRecord = {
    id: string
    url: string
    filename: string
    alt: string | null
    isPrimary: boolean
    order: number
    width: number | null
    height: number | null
    sizeBytes: number | null
    productId: string
}

async function revalidateProductImages(productId: string) {
    revalidateProduct(productId)
    revalidatePath('/gallery')
}

function mapRecord(pi: {
    id: string
    url: string
    filename: string
    alt: string | null
    isPrimary: boolean
    order: number
    width: number | null
    height: number | null
    sizeBytes: number | null
    productId: string
}): ProductImageRecord {
    return {
        id: pi.id,
        url: toDisplayUrl(pi.url),
        filename: pi.filename,
        alt: pi.alt,
        isPrimary: pi.isPrimary,
        order: pi.order,
        width: pi.width,
        height: pi.height,
        sizeBytes: pi.sizeBytes,
        productId: pi.productId,
    }
}

export async function getProductImages(productId: string): Promise<{ success: boolean; data: ProductImageRecord[]; error?: string }> {
    try {
        await requireAuth()
        const pis = await prisma.productImage.findMany({
            where: { productId },
            orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
        })
        return { success: true, data: pis.map(mapRecord) }
    } catch (error) {
        console.error('Failed to get product images:', error)
        return { success: false, data: [], error: 'فشل جلب الصور' }
    }
}

export async function addProductImage(
    productId: string,
    file: File
): Promise<{ success: boolean; data?: ProductImageRecord; error?: string }> {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, itemNumber: true },
        })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        const folderKey = product.itemNumber || product.id
        const existingCount = await prisma.productImage.count({ where: { productId } })
        if (existingCount >= IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct) {
            return { success: false, error: `الحد الأقصى ${IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct} صور للمنتج` }
        }

        const maxOrderRow = await prisma.productImage.findFirst({
            where: { productId },
            orderBy: { order: 'desc' },
            select: { order: true },
        })
        const nextOrder = (maxOrderRow?.order ?? -1) + 1

        const result = await uploadProductImage(file, folderKey)
        if (!result.success || !result.url) {
            return { success: false, error: result.error || 'فشل رفع الصورة' }
        }

        const pi = await prisma.productImage.create({
            data: {
                productId,
                url: result.url,
                filename: result.filename!,
                sizeBytes: result.sizeBytes ?? null,
                width: result.width ?? null,
                height: result.height ?? null,
                isPrimary: existingCount === 0,
                order: nextOrder,
            },
        })

        await revalidateProductImages(productId)
        return { success: true, data: mapRecord(pi) }
    } catch (error) {
        console.error('Failed to add product image:', error)
        return { success: false, error: 'فشل إضافة الصورة' }
    }
}

export async function removeProductImage(productImageId: string) {
    try {
        await requireAuth()
        const pi = await prisma.productImage.findUnique({
            where: { id: productImageId },
            select: { id: true, productId: true, url: true, isPrimary: true },
        })
        if (!pi) return { success: false, error: 'الصورة غير موجودة' }

        const { productId, isPrimary: wasPrimary } = pi
        await deleteImageFile(pi.url)
        await prisma.productImage.delete({ where: { id: productImageId } })

        if (wasPrimary) {
            const first = await prisma.productImage.findFirst({
                where: { productId },
                orderBy: { order: 'asc' },
            })
            if (first) {
                await prisma.productImage.update({ where: { id: first.id }, data: { isPrimary: true } })
            }
        }

        await revalidateProductImages(productId)
        return { success: true }
    } catch {
        return { success: false, error: 'فشل حذف الصورة' }
    }
}

export async function setPrimaryProductImage(productImageId: string) {
    try {
        await requireAuth()
        const pi = await prisma.productImage.findUnique({
            where: { id: productImageId },
            select: { id: true, productId: true },
        })
        if (!pi) return { success: false, error: 'الصورة غير موجودة' }

        await prisma.productImage.updateMany({
            where: { productId: pi.productId },
            data: { isPrimary: false },
        })
        await prisma.productImage.update({
            where: { id: productImageId },
            data: { isPrimary: true },
        })

        await revalidateProductImages(pi.productId)
        return { success: true }
    } catch {
        return { success: false, error: 'فشل تحديث الصورة الرئيسية' }
    }
}

export async function reorderProductImages(productImageIds: string[]) {
    try {
        await requireAuth()
        await Promise.all(
            productImageIds.map((id, index) =>
                prisma.productImage.update({ where: { id }, data: { order: index } })
            )
        )
        if (productImageIds.length > 0) {
            const first = await prisma.productImage.findUnique({
                where: { id: productImageIds[0] },
                select: { productId: true },
            })
            if (first) await revalidateProductImages(first.productId)
        }
        return { success: true }
    } catch {
        return { success: false, error: 'فشل إعادة ترتيب الصور' }
    }
}
