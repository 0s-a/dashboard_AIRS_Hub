'use server'

import { prisma } from '@/lib/prisma'

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
                productImages: { include: { mediaImage: { select: { url: true } } }, where: { isPrimary: true }, take: 1 },
                brand: true,
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: products }
    } catch (error) {
        console.error('Failed to fetch products by tag:', error)
        return { success: false, error: 'فشل جلب المنتجات', data: [] }
    }
}
