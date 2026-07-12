'use server'

import { prisma } from '@/lib/prisma'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { requireAuth } from '@/lib/auth-utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GalleryImage = {
    id: string
    url: string
    filename: string
    alt: string | null
    width: number | null
    height: number | null
    isPrimary: boolean
    skcId: string
    defaultSkuId: string | null
    productId: string
    productName: string
    productNumber: string
    itemNumber: string | null
    categoryName: string | null
}

export type GalleryStats = {
    totalImages: number
    totalProducts: number
}

const PAGE_SIZE = 30

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Paginated gallery — images linked to SKC only.
 */
export async function getGalleryImages(cursor?: string): Promise<{
    success: boolean
    data: GalleryImage[]
    nextCursor: string | null
    error?: string
}> {
    try {
        await requireAuth()
        const productImages = await prisma.productImage.findMany({
            take: PAGE_SIZE + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: [{ createdAt: 'desc' }],
            select: {
                id: true,
                url: true,
                filename: true,
                alt: true,
                width: true,
                height: true,
                isPrimary: true,
                skcId: true,
                skc: {
                    select: {
                        itemNumber: true,
                        skus: {
                            orderBy: [{ isDefault: "desc" }, { order: "asc" }],
                            take: 1,
                            select: { id: true },
                        },
                        product: {
                            select: {
                                id: true,
                                name: true,
                                productNumber: true,
                                category: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        })

        const hasMore = productImages.length > PAGE_SIZE
        const items = hasMore ? productImages.slice(0, PAGE_SIZE) : productImages

        const data: GalleryImage[] = items.map((pi) => ({
            id: pi.id,
            url: toDisplayUrl(pi.url),
            filename: pi.filename,
            alt: pi.alt,
            width: pi.width,
            height: pi.height,
            isPrimary: pi.isPrimary,
            skcId: pi.skcId,
            defaultSkuId: pi.skc.skus[0]?.id ?? null,
            productId: pi.skc.product.id,
            productName: pi.skc.product.name,
            productNumber: pi.skc.product.productNumber,
            itemNumber: pi.skc.itemNumber,
            categoryName: pi.skc.product.category?.name ?? null,
        }))

        return {
            success: true,
            data,
            nextCursor: hasMore ? items[items.length - 1].id : null,
        }
    } catch (error) {
        console.error('Failed to fetch gallery images:', error)
        return { success: false, data: [], nextCursor: null, error: 'فشل جلب معرض الصور' }
    }
}

/** Quick stats for the gallery header. */
export async function getGalleryStats(): Promise<{
    success: boolean
    data: GalleryStats
}> {
    try {
        await requireAuth()
        const [totalImages, productsWithImages] = await Promise.all([
            prisma.productImage.count(),
            prisma.product.count({
                where: { skcs: { some: { images: { some: {} } } } },
            }),
        ])

        return {
            success: true,
            data: {
                totalImages,
                totalProducts: productsWithImages,
            },
        }
    } catch (error) {
        console.error('Failed to fetch gallery stats:', error)
        return {
            success: true,
            data: { totalImages: 0, totalProducts: 0 },
        }
    }
}
