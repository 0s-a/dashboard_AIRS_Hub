'use server'

import { Prisma } from '@prisma/client'
import { prisma, PRODUCT_INCLUDE, serializeProduct } from './_shared'
import type { ProductsFilters, PaginationMeta } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// READ — Product Queries
// ─────────────────────────────────────────────────────────────

/** Fetch all products (no pagination) */
export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            include: PRODUCT_INCLUDE,
        })
        return { success: true, data: products.map(serializeProduct) }
    } catch (error) {
        console.error('Failed to fetch products:', error)
        return { success: false, error: 'فشل جلب المنتجات', data: [] }
    }
}

/** Fetch products with server-side pagination and filtering */
export async function getProductsPaginated(filters: ProductsFilters = {}) {
    try {
        const {
            search,
            categoryId,
            brandId,
            isAvailable,
            hasPrices,
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortDir = 'desc',
        } = filters

        const safePage  = Math.max(1, page)
        const safeLimit = Math.min(Math.max(1, limit), 200)
        const skip = (safePage - 1) * safeLimit

        // ── Build WHERE clause ───────────────────────────────────────
        const where: Prisma.ProductWhereInput = {}

        if (search?.trim()) {
            const q = search.trim()
            where.OR = [
                { name:        { contains: q, mode: 'insensitive' } },
                { productCode: { contains: q, mode: 'insensitive' } },
                { itemNumber:  { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { brandRef: { name: { contains: q, mode: 'insensitive' } } },
                { variants: { some: {
                    OR: [
                        { name:          { contains: q, mode: 'insensitive' } },
                        { variantNumber: { contains: q, mode: 'insensitive' } },
                        { suffix:        { contains: q, mode: 'insensitive' } },
                    ]
                }}},
            ]
        }

        if (categoryId && categoryId !== 'all') where.categoryId = categoryId
        if (brandId   && brandId   !== 'all') where.brandId = brandId
        if (typeof isAvailable === 'boolean') where.isAvailable = isAvailable
        if (hasPrices === true)  where.productPrices = { some: {} }
        if (hasPrices === false) where.productPrices = { none: {} }

        // ── Run queries in parallel ──────────────────────────────────
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { [sortBy]: sortDir },
                include: PRODUCT_INCLUDE,
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

/** Fetch brand + category options for filter dropdowns */
export async function getProductFilterOptions() {
    try {
        const [brands, categories] = await Promise.all([
            prisma.brand.findMany({
                select:  { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
            }),
            prisma.category.findMany({
                select:  { id: true, name: true, icon: true },
                orderBy: { name: 'asc' },
            }),
        ])

        return {
            success: true,
            brands,      // { id, name, code }[]
            categories,
        }
    } catch (error) {
        console.error('Failed to fetch filter options:', error)
        return { success: false, brands: [], categories: [] }
    }
}

/** Fetch a single product by ID */
export async function getProductById(id: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: PRODUCT_INCLUDE,
        })
        if (!product) return { success: false, error: 'المنتج غير موجود', data: null }
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Failed to fetch product:', error)
        return { success: false, error: 'فشل جلب المنتج', data: null }
    }
}

