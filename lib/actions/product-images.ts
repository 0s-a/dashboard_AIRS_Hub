'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { uploadProductImage, deleteProductImage as deleteImageFile } from './upload'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'

// ─── Types ────────────────────────────────────────────────────────────────────

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
    variantIds: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function revalidateProduct(productId: string) {
    revalidatePath('/inventory')
    revalidatePath(`/inventory/${productId}`)
}

/** Map a ProductImage DB record into a flat client-safe record */
function mapRecord(pi: any): ProductImageRecord {
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
        variantIds: (pi.variants || []).map((v: any) => v.id),
    }
}

// Include clause for variant ids
const INCLUDE_VARIANTS = { variants: { select: { id: true } } } as const

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProductImages(productId: string): Promise<{ success: boolean; data: ProductImageRecord[]; error?: string }> {
    try {
        const pis = await prisma.productImage.findMany({
            where: { productId },
            include: INCLUDE_VARIANTS,
            orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
        })

        return { success: true, data: pis.map(mapRecord) }
    } catch (error) {
        console.error('Failed to get product images:', error)
        return { success: false, data: [], error: 'فشل جلب الصور' }
    }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addProductImage(
    productId: string,
    file: File
): Promise<{ success: boolean; data?: ProductImageRecord; error?: string }> {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { productCode: true },
        })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        const existingCount = await prisma.productImage.count({ where: { productId } })
        if (existingCount >= IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct) {
            return { success: false, error: `الحد الأقصى ${IMAGE_STORAGE_CONFIG.upload.maxImagesPerProduct} صور للمنتج الواحد` }
        }

        const isFirst = existingCount === 0

        // Upload the file to disk — filename will be 01.webp, 02.webp, etc.
        const result = await uploadProductImage(file, product.productCode, existingCount)
        if (!result.success || !result.url) {
            return { success: false, error: result.error || 'فشل رفع الصورة' }
        }

        // Create ProductImage record with image metadata directly
        const pi = await prisma.productImage.create({
            data: {
                productId,
                url: result.url,
                filename: result.filename!,
                sizeBytes: result.sizeBytes ?? null,
                width: result.width ?? null,
                height: result.height ?? null,
                isPrimary: isFirst,
                order: existingCount,
            },
            include: INCLUDE_VARIANTS,
        })

        revalidateProduct(productId)
        return { success: true, data: mapRecord(pi) }
    } catch (error) {
        console.error('Failed to add product image:', error)
        return { success: false, error: 'فشل إضافة الصورة' }
    }
}

export async function removeProductImage(
    productImageId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pi = await prisma.productImage.findUnique({
            where: { id: productImageId },
        })
        if (!pi) return { success: false, error: 'الصورة غير موجودة' }

        const { productId, isPrimary: wasPrimary } = pi

        // Delete the file from disk
        await deleteImageFile(pi.url)

        // Delete the ProductImage record
        await prisma.productImage.delete({ where: { id: productImageId } })

        // If deleted image was primary, make the first remaining one primary
        if (wasPrimary) {
            const first = await prisma.productImage.findFirst({
                where: { productId },
                orderBy: { order: 'asc' },
            })
            if (first) {
                await prisma.productImage.update({
                    where: { id: first.id },
                    data: { isPrimary: true },
                })
            }
        }

        // Re-order remaining
        const remaining = await prisma.productImage.findMany({
            where: { productId },
            orderBy: { order: 'asc' },
        })
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].order !== i) {
                await prisma.productImage.update({
                    where: { id: remaining[i].id },
                    data: { order: i },
                })
            }
        }

        revalidateProduct(productId)
        return { success: true }
    } catch (error) {
        console.error('Failed to remove product image:', error)
        return { success: false, error: 'فشل حذف الصورة' }
    }
}

export async function setPrimaryProductImage(
    productImageId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pi = await prisma.productImage.findUnique({
            where: { id: productImageId },
        })
        if (!pi) return { success: false, error: 'الصورة غير موجودة' }

        // Unset all, then set this one
        await prisma.productImage.updateMany({
            where: { productId: pi.productId },
            data: { isPrimary: false },
        })
        await prisma.productImage.update({
            where: { id: productImageId },
            data: { isPrimary: true },
        })

        revalidateProduct(pi.productId)
        return { success: true }
    } catch (error) {
        console.error('Failed to set primary image:', error)
        return { success: false, error: 'فشل تحديث الصورة الرئيسية' }
    }
}

export async function reorderProductImages(
    productImageIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await Promise.all(
            productImageIds.map((id, index) =>
                prisma.productImage.update({
                    where: { id },
                    data: { order: index },
                })
            )
        )

        if (productImageIds.length > 0) {
            const first = await prisma.productImage.findUnique({ where: { id: productImageIds[0] } })
            if (first) revalidateProduct(first.productId)
        }

        return { success: true }
    } catch (error) {
        console.error('Failed to reorder images:', error)
        return { success: false, error: 'فشل إعادة ترتيب الصور' }
    }
}

export async function toggleVariantForProductImage(
    productImageId: string,
    variantId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const current = await prisma.productImage.findUnique({
            where: { id: productImageId },
            include: { variants: { select: { id: true } } }
        })
        
        if (!current) return { success: false, error: 'الصورة غير موجودة' }
        
        const hasVariant = current.variants.some((v: any) => v.id === variantId)
        
        const pi = await prisma.productImage.update({
            where: { id: productImageId },
            data: {
                variants: hasVariant 
                  ? { disconnect: { id: variantId } } 
                  : { connect: { id: variantId } }
            },
        })

        revalidateProduct(pi.productId)
        return { success: true }
    } catch (error) {
        console.error('Failed to toggle variant for image:', error)
        return { success: false, error: 'فشل ربط المتغير بالصورة' }
    }
}
