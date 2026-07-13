'use server'

import { prisma } from '@/lib/prisma'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import { requireAuth } from '@/lib/auth-utils'

export type GalleryImage = {
    id: string
    url: string
    filename: string
    alt: string | null
    width: number | null
    height: number | null
    isPrimary: boolean
    productId: string
    productName: string
    itemNumber: string | null
    categoryName: string | null
}

export type GalleryStats = {
    totalImages: number
    totalProducts: number
}

const PAGE_SIZE = 30

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
                productId: true,
                product: {
                    select: {
                        id: true,
                        name: true,
                        itemNumber: true,
                        category: { select: { name: true } },
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
            productId: pi.product.id,
            productName: pi.product.name,
            itemNumber: pi.product.itemNumber,
            categoryName: pi.product.category?.name ?? null,
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

export async function getGalleryStats(): Promise<{
    success: boolean
    data: GalleryStats
}> {
    try {
        await requireAuth()
        const [totalImages, productsWithImages] = await Promise.all([
            prisma.productImage.count(),
            prisma.product.count({
                where: { productImages: { some: {} } },
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
