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
    itemId: string
    itemName: string
    itemNumber: string | null
    categoryName: string | null
    /** @deprecated use itemId */
    productId: string
    /** @deprecated use itemName */
    productName: string
}

export type GalleryStats = {
    totalImages: number
    totalItems: number
    /** @deprecated use totalItems */
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
        const itemImages = await prisma.itemImage.findMany({
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
                itemId: true,
                item: {
                    select: {
                        id: true,
                        name: true,
                        itemNumber: true,
                        product: {
                            select: {
                                category: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        })

        const hasMore = itemImages.length > PAGE_SIZE
        const items = hasMore ? itemImages.slice(0, PAGE_SIZE) : itemImages

        const data: GalleryImage[] = items.map((img) => ({
            id: img.id,
            url: toDisplayUrl(img.url),
            filename: img.filename,
            alt: img.alt,
            width: img.width,
            height: img.height,
            isPrimary: img.isPrimary,
            itemId: img.item.id,
            itemName: img.item.name,
            itemNumber: img.item.itemNumber,
            categoryName: img.item.product?.category?.name ?? null,
            productId: img.item.id,
            productName: img.item.name,
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
        const [totalImages, itemsWithImages] = await Promise.all([
            prisma.itemImage.count(),
            prisma.item.count({
                where: { itemImages: { some: {} } },
            }),
        ])

        return {
            success: true,
            data: {
                totalImages,
                totalItems: itemsWithImages,
                totalProducts: itemsWithImages,
            },
        }
    } catch (error) {
        console.error('Failed to fetch gallery stats:', error)
        return {
            success: true,
            data: { totalImages: 0, totalItems: 0, totalProducts: 0 },
        }
    }
}
