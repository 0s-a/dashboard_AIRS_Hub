'use server'

import { Prisma } from '@prisma/client'
import { prisma, ITEM_INCLUDE, ITEM_LIST_INCLUDE, serializeItem } from './_shared'
import type { ItemsFilters, PaginationMeta } from '@/lib/types/item'
import { requireAuth } from '@/lib/auth-utils'

export async function getItems() {
    try {
        await requireAuth()
        const items = await prisma.item.findMany({
            orderBy: { createdAt: 'desc' },
            include: ITEM_INCLUDE as any,
        })
        return { success: true, data: items.map(serializeItem) }
    } catch (error) {
        console.error('Failed to fetch items:', error)
        return { success: false, error: 'فشل جلب الأصناف', data: [] }
    }
}

export async function getItemsPaginated(filters: ItemsFilters = {}) {
    try {
        await requireAuth()
        const {
            search,
            categoryId,
            productId,
            brandId,
            hasPrices,
            isAvailable,
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortDir = 'desc',
        } = filters

        const safePage = Math.max(1, page)
        const safeLimit = Math.min(Math.max(1, limit), 200)
        const skip = (safePage - 1) * safeLimit

        const where: Prisma.ItemWhereInput = {}

        if (search?.trim()) {
            const q = search.trim()
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { itemNumber: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { product: { brand: { name: { contains: q, mode: 'insensitive' } } } },
                { product: { name: { contains: q, mode: 'insensitive' } } },
                { product: { category: { name: { contains: q, mode: 'insensitive' } } } },
                {
                    itemAttributes: {
                        some: {
                            OR: [
                                { value: { contains: q, mode: 'insensitive' } },
                                { attribute: { name: { contains: q, mode: 'insensitive' } } },
                                { attribute: { code: { contains: q, mode: 'insensitive' } } },
                            ],
                        },
                    },
                },
            ]
        }

        const productWhere: Prisma.ProductWhereInput = {}
        if (categoryId && categoryId !== 'all') productWhere.categoryId = categoryId
        if (brandId && brandId !== 'all') productWhere.brandId = brandId
        if (productId && productId !== 'all') productWhere.id = productId
        if (Object.keys(productWhere).length > 0) {
            where.product = productWhere
        }
        if (isAvailable === true) where.isAvailable = true
        if (isAvailable === false) where.isAvailable = false
        if (hasPrices === true) where.itemPrices = { some: {} }
        if (hasPrices === false) where.itemPrices = { none: {} }

        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { [sortBy]: sortDir },
                include: ITEM_LIST_INCLUDE as any,
            }),
            prisma.item.count({ where }),
        ])

        const pages = Math.ceil(total / safeLimit)

        return {
            success: true,
            data: items.map(serializeItem),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                pages,
                hasPrev: safePage > 1,
                hasNext: safePage < pages,
            } satisfies PaginationMeta,
        }
    } catch (error) {
        console.error('Failed to fetch paginated items:', error)
        return {
            success: false,
            error: 'فشل جلب الأصناف',
            data: [],
            pagination: { page: 1, limit: 50, total: 0, pages: 0, hasPrev: false, hasNext: false },
        }
    }
}

export async function getItemFilterOptions() {
    try {
        await requireAuth()
        const [brands, categories, products] = await Promise.all([
            prisma.brand.findMany({
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
            prisma.category.findMany({
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
            prisma.product.findMany({
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
        ])

        return { success: true, brands, categories, products }
    } catch (error) {
        console.error('Failed to fetch filter options:', error)
        return { success: false, brands: [], categories: [], products: [] }
    }
}

export async function getItemById(id: string) {
    try {
        await requireAuth()
        const item = await prisma.item.findUnique({
            where: { id },
            include: ITEM_INCLUDE as any,
        })
        if (!item) return { success: false, error: 'الصنف غير موجود', data: null }
        return { success: true, data: serializeItem(item) }
    } catch (error) {
        console.error('Failed to fetch item:', error)
        return { success: false, error: 'فشل جلب الصنف', data: null }
    }
}
