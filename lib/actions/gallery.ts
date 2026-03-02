'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { uploadGalleryImage, deleteProductImage } from '@/lib/actions/upload'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GalleryImageData = {
    id: string
    url: string
    filename: string
    alt: string | null
    sizeBytes: number | null
    width: number | null
    height: number | null
    productId: string | null      // derived from junction
    product: { id: string; name: string; itemNumber: string } | null
    createdAt: Date
    updatedAt: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapGalleryImage(img: any): GalleryImageData {
    const firstLink = img.productImages?.[0]
    return {
        id: img.id,
        url: img.url,
        filename: img.filename,
        alt: img.alt,
        sizeBytes: img.sizeBytes,
        width: img.width,
        height: img.height,
        productId: firstLink?.productId ?? null,
        product: firstLink?.product ?? null,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getGalleryImages(filter: 'all' | 'linked' | 'unlinked' = 'all') {
    try {
        const where =
            filter === 'linked'
                ? { productImages: { some: {} } }
                : filter === 'unlinked'
                    ? { productImages: { none: {} } }
                    : {}

        const images = await prisma.mediaImage.findMany({
            where,
            include: {
                productImages: {
                    take: 1,
                    include: {
                        product: { select: { id: true, name: true, itemNumber: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: images.map(mapGalleryImage) }
    } catch (error) {
        console.error('Failed to fetch gallery images:', error)
        return { success: false, error: 'فشل جلب صور المعرض', data: [] }
    }
}

export async function getGalleryStats() {
    try {
        const [total, linked, unlinked] = await Promise.all([
            prisma.mediaImage.count(),
            prisma.mediaImage.count({ where: { productImages: { some: {} } } }),
            prisma.mediaImage.count({ where: { productImages: { none: {} } } })
        ])
        return { success: true, data: { total, linked, unlinked } }
    } catch (error) {
        console.error('Failed to fetch gallery stats:', error)
        return { success: false, data: { total: 0, linked: 0, unlinked: 0 } }
    }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function saveGalleryImage(file: File) {
    try {
        const result = await uploadGalleryImage(file)
        if (!result.success || !result.url) {
            return { success: false, error: result.error || 'فشل رفع الصورة' }
        }

        const image = await prisma.mediaImage.create({
            data: {
                url: result.url,
                filename: result.filename ?? file.name,
                alt: null,
                sizeBytes: result.sizeBytes ?? null,
                width: result.width ?? null,
                height: result.height ?? null,
            }
        })

        revalidatePath('/gallery')
        return { success: true, data: image }
    } catch (error) {
        console.error('Failed to save gallery image:', error)
        return { success: false, error: 'فشل حفظ الصورة' }
    }
}

export async function linkImageToProduct(imageId: string, productId: string) {
    try {
        const product = await prisma.product.findUnique({ where: { id: productId } })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        // Get current max order for this product
        const maxOrder = await prisma.productImage.aggregate({
            where: { productId },
            _max: { order: true },
        })
        const nextOrder = (maxOrder._max.order ?? -1) + 1
        const hasImages = await prisma.productImage.count({ where: { productId } })

        // Create junction record (upsert to avoid duplicate)
        await prisma.productImage.upsert({
            where: { productId_mediaImageId: { productId, mediaImageId: imageId } },
            create: {
                productId,
                mediaImageId: imageId,
                order: nextOrder,
                isPrimary: hasImages === 0,
            },
            update: {},
        })

        revalidatePath('/gallery')
        revalidatePath(`/inventory/${productId}`)
        return { success: true }
    } catch (error) {
        console.error('Failed to link image:', error)
        return { success: false, error: 'فشل ربط الصورة بالمنتج' }
    }
}

export async function unlinkImageFromProduct(imageId: string) {
    try {
        // Delete all junction records for this image
        await prisma.productImage.deleteMany({
            where: { mediaImageId: imageId }
        })

        revalidatePath('/gallery')
        return { success: true }
    } catch (error) {
        console.error('Failed to unlink image:', error)
        return { success: false, error: 'فشل إلغاء ربط الصورة' }
    }
}

export async function updateImageAlt(imageId: string, alt: string) {
    try {
        await prisma.mediaImage.update({
            where: { id: imageId },
            data: { alt: alt.trim() || null }
        })
        revalidatePath('/gallery')
        return { success: true }
    } catch (error) {
        console.error('Failed to update alt:', error)
        return { success: false, error: 'فشل تحديث النص البديل' }
    }
}

export async function deleteGalleryImage(imageId: string) {
    try {
        const image = await prisma.mediaImage.findUnique({ where: { id: imageId } })
        if (!image) return { success: false, error: 'الصورة غير موجودة' }

        // Delete from disk
        await deleteProductImage(image.url)

        // Delete from DB (cascade will remove junction records)
        await prisma.mediaImage.delete({ where: { id: imageId } })

        revalidatePath('/gallery')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete gallery image:', error)
        return { success: false, error: 'فشل حذف الصورة' }
    }
}
