'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { uploadProductImage, deleteProductImage as deleteImageFile } from './upload'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'
import { requireAuth } from '@/lib/auth-utils'
import { upsertProductToMeilisearch } from '@/lib/utils/meilisearch-sync'
import { revalidateAllSkusForSkc } from '@/lib/actions/inventory/_shared'

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
    skcId: string
}

async function revalidateSkcImages(skcId: string, productId: string) {
    revalidatePath('/products')
    revalidatePath('/inventory')
    revalidatePath('/gallery')
    await revalidateAllSkusForSkc(skcId, productId)
    upsertProductToMeilisearch(productId).catch(console.warn)
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
    skcId: string
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
        skcId: pi.skcId,
    }
}

export async function getSkcImages(skcId: string): Promise<{ success: boolean; data: ProductImageRecord[]; error?: string }> {
    try {
        await requireAuth()
        const pis = await prisma.productImage.findMany({
            where: { skcId },
            orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
        })
        return { success: true, data: pis.map(mapRecord) }
    } catch (error) {
        console.error('Failed to get skc images:', error)
        return { success: false, data: [], error: 'فشل جلب الصور' }
    }
}

export async function addSkcImage(
    skcId: string,
    file: File
): Promise<{ success: boolean; data?: ProductImageRecord; error?: string }> {
    try {
        await requireAuth()
        const skc = await prisma.sKC.findUnique({
            where: { id: skcId },
            include: { product: { select: { id: true, productNumber: true } } },
        })
        if (!skc) return { success: false, error: 'الصنف غير موجود' }

        const existingCount = await prisma.productImage.count({ where: { skcId } })
        if (existingCount >= IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct) {
            return { success: false, error: `الحد الأقصى ${IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct} صور للصنف` }
        }

        const result = await uploadProductImage(file, skc.product.productNumber, existingCount)
        if (!result.success || !result.url) {
            return { success: false, error: result.error || 'فشل رفع الصورة' }
        }

        const pi = await prisma.productImage.create({
            data: {
                skcId,
                url: result.url,
                filename: result.filename!,
                sizeBytes: result.sizeBytes ?? null,
                width: result.width ?? null,
                height: result.height ?? null,
                isPrimary: existingCount === 0,
                order: existingCount,
            },
        })

        await revalidateSkcImages(skcId, skc.product.id)
        return { success: true, data: mapRecord(pi) }
    } catch (error) {
        console.error('Failed to add skc image:', error)
        return { success: false, error: 'فشل إضافة الصورة' }
    }
}

export async function removeProductImage(productImageId: string) {
    try {
        await requireAuth()
        const pi = await prisma.productImage.findUnique({
            where: { id: productImageId },
            include: { skc: { select: { id: true, productId: true } } },
        })
        if (!pi) return { success: false, error: 'الصورة غير موجودة' }

        const { skcId, isPrimary: wasPrimary } = pi
        const productId = pi.skc.productId
        await deleteImageFile(pi.url)
        await prisma.productImage.delete({ where: { id: productImageId } })

        if (wasPrimary) {
            const first = await prisma.productImage.findFirst({
                where: { skcId },
                orderBy: { order: 'asc' },
            })
            if (first) {
                await prisma.productImage.update({ where: { id: first.id }, data: { isPrimary: true } })
            }
        }

        await revalidateSkcImages(skcId, productId)
        return { success: true }
    } catch (error) {
        return { success: false, error: 'فشل حذف الصورة' }
    }
}

export async function setPrimaryProductImage(productImageId: string) {
    try {
        await requireAuth()
        const pi = await prisma.productImage.findUnique({
            where: { id: productImageId },
            include: { skc: { select: { id: true, productId: true } } },
        })
        if (!pi) return { success: false, error: 'الصورة غير موجودة' }

        await prisma.productImage.updateMany({
            where: { skcId: pi.skcId },
            data: { isPrimary: false },
        })
        await prisma.productImage.update({
            where: { id: productImageId },
            data: { isPrimary: true },
        })

        await revalidateSkcImages(pi.skcId, pi.skc.productId)
        return { success: true }
    } catch (error) {
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
                include: { skc: { select: { id: true, productId: true } } },
            })
            if (first) await revalidateSkcImages(first.skcId, first.skc.productId)
        }
        return { success: true }
    } catch (error) {
        return { success: false, error: 'فشل إعادة ترتيب الصور' }
    }
}
