'use server'

import { Prisma } from '@prisma/client'
import { prisma, PRODUCT_INCLUDE, PRODUCT_LIST_INCLUDE, serializeProduct } from './_shared'
import type { ProductsFilters, PaginationMeta } from '@/lib/types/product'
import { requireAuth } from '@/lib/auth-utils'

export async function getProducts() {
    try {
        await requireAuth()
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            include: PRODUCT_INCLUDE as any,
        })
        return { success: true, data: products.map(serializeProduct) }
    } catch (error) {
        console.error('Failed to fetch products:', error)
        return { success: false, error: 'فشل جلب المنتجات', data: [] }
    }
}

export async function getProductsPaginated(filters: ProductsFilters = {}) {
    try {
        await requireAuth()
        const {
            search,
            categoryId,
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

        const where: Prisma.ProductWhereInput = {}

        if (search?.trim()) {
            const q = search.trim()
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { itemNumber: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { brandRef: { name: { contains: q, mode: 'insensitive' } } },
                { category: { name: { contains: q, mode: 'insensitive' } } },
                {
                    productAttributes: {
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

        if (categoryId && categoryId !== 'all') where.categoryId = categoryId
        if (brandId && brandId !== 'all') where.brandId = brandId
        if (isAvailable === true) where.isAvailable = true
        if (isAvailable === false) where.isAvailable = false
        if (hasPrices === true) where.productPrices = { some: {} }
        if (hasPrices === false) where.productPrices = { none: {} }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { [sortBy]: sortDir },
                include: PRODUCT_LIST_INCLUDE as any,
            }),
            prisma.product.count({ where }),
        ])

        const pages = Math.ceil(total / safeLimit)

        return {
            success: true,
            data: products.map(serializeProduct),
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
        console.error('Failed to fetch paginated products:', error)
        return {
            success: false,
            error: 'فشل جلب المنتجات',
            data: [],
            pagination: { page: 1, limit: 50, total: 0, pages: 0, hasPrev: false, hasNext: false },
        }
    }
}

export async function getProductFilterOptions() {
    try {
        await requireAuth()
        const [brands, categories] = await Promise.all([
            prisma.brand.findMany({
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
            prisma.category.findMany({
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
        ])

        return { success: true, brands, categories }
    } catch (error) {
        console.error('Failed to fetch filter options:', error)
        return { success: false, brands: [], categories: [] }
    }
}

export async function getProductById(id: string) {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id },
            include: PRODUCT_INCLUDE as any,
        })
        if (!product) return { success: false, error: 'المنتج غير موجود', data: null }
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Failed to fetch product:', error)
        return { success: false, error: 'فشل جلب المنتج', data: null }
    }
}
