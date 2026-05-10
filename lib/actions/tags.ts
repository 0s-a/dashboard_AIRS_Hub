'use server'

import { prisma } from '@/lib/prisma'
import { toDisplayUrl } from '@/lib/utils/image-paths'

// Get all unique tags used across all products
export async function getProductTags(): Promise<string[]> {
    try {
        const products = await prisma.product.findMany({
            select: { tags: true }
        })
        const allTags = products.flatMap((p: { tags?: any }) => (p.tags as string[] | null) || [])
        return Array.from(new Set(allTags)).sort() as string[]
    } catch (error) {
        console.error('Failed to fetch product tags:', error)
        return []
    }
}

// Get all products that have a specific tag
export async function getProductsByTag(tag: string) {
    try {
        const products = await prisma.product.findMany({
            where: {
                tags: { array_contains: tag }
            },
            select: {
                id: true,
                name: true,
                itemNumber: true,
                tags: true,
                isAvailable: true,
                productImages: { select: { url: true, isPrimary: true }, where: { isPrimary: true }, take: 1 },
                brandId: true,
            },
            orderBy: { name: 'asc' }
        })
        const mapped = products.map((p: any) => ({
            ...p,
            productImages: (p.productImages || []).map((pi: any) => ({
                ...pi,
                url: toDisplayUrl(pi.url),
            })),
        }))
        return { success: true, data: mapped }
    } catch (error) {
        console.error('Failed to fetch products by tag:', error)
        return { success: false, error: 'فشل جلب المنتجات', data: [] }
    }
}
