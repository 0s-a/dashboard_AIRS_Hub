'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { ProductPayload } from '@/lib/types/product'
import { syncItemsByProductId } from '@/lib/utils/meilisearch-sync'

const REVALIDATE_PATHS = ['/products', '/items']

const PRODUCT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/

function normalizeProductCode(raw: string): string {
    return raw.trim().toUpperCase()
}

function validateProductPayload(data: ProductPayload) {
    const name = data.name?.trim()
    if (!name) throw new Error('اسم المنتج مطلوب')

    const code = normalizeProductCode(data.code ?? '')
    if (!code) throw new Error('كود المنتج مطلوب')
    if (!PRODUCT_CODE_PATTERN.test(code)) {
        throw new Error('كود المنتج: حروف/أرقام إنجليزية، ويمكن شرطة أو شرطة سفلية (حتى 32 خانة)')
    }

    const categoryId = data.categoryId?.trim()
    if (!categoryId) throw new Error('التصنيف مطلوب')

    const brandId = data.brandId?.trim()
    if (!brandId) throw new Error('البراند مطلوب')

    return {
        name,
        code,
        categoryId,
        brandId,
        description: data.description?.trim() || null,
    }
}

function reindexProductItems(productId: string) {
    syncItemsByProductId(productId).catch(console.warn)
}

// ─── READ ─────────────────────────────────────────────────────

/** Fetch all products (SPU) ordered alphabetically, including item count */
export async function getProducts() {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.product.findMany({
                orderBy: { name: 'asc' },
                include: {
                    category: { select: { id: true, name: true, code: true } },
                    brand: { select: { id: true, name: true, code: true, logo: true } },
                    _count: { select: { items: true } },
                },
            })
        },
        'تعذّر جلب المنتجات'
    )
}

// ─── WRITE ────────────────────────────────────────────────────

/** Create a new product (SPU). Code is always stored uppercase. */
export async function createProduct(data: ProductPayload) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validateProductPayload(data)
            const [category, brand] = await Promise.all([
                prisma.category.findUnique({
                    where: { id: payload.categoryId },
                    select: { id: true },
                }),
                prisma.brand.findUnique({
                    where: { id: payload.brandId },
                    select: { id: true },
                }),
            ])
            if (!category) throw new Error('التصنيف غير موجود')
            if (!brand) throw new Error('البراند غير موجود')
            return prisma.product.create({ data: payload })
        },
        REVALIDATE_PATHS,
        'تعذّر إنشاء المنتج'
    )
}

/** Update an existing product by ID. Re-indexes linked items in Meili when name/brand/category change. */
export async function updateProduct(id: string, data: ProductPayload) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validateProductPayload(data)
            const [category, brand, existing] = await Promise.all([
                prisma.category.findUnique({
                    where: { id: payload.categoryId },
                    select: { id: true },
                }),
                prisma.brand.findUnique({
                    where: { id: payload.brandId },
                    select: { id: true },
                }),
                prisma.product.findUnique({
                    where: { id },
                    select: { name: true, brandId: true, categoryId: true },
                }),
            ])
            if (!category) throw new Error('التصنيف غير موجود')
            if (!brand) throw new Error('البراند غير موجود')
            if (!existing) {
                throw Object.assign(new Error('المنتج غير موجود'), { code: 'P2025' })
            }

            const updated = await prisma.product.update({
                where: { id },
                data: payload,
            })

            const shouldReindex =
                existing.name !== payload.name ||
                existing.brandId !== payload.brandId ||
                existing.categoryId !== payload.categoryId

            if (shouldReindex) {
                reindexProductItems(id)
            }

            return updated
        },
        REVALIDATE_PATHS,
        'تعذّر تعديل المنتج'
    )
}

/**
 * Delete a product by ID.
 * Rejects if any items are linked.
 */
export async function deleteProduct(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const product = await prisma.product.findUnique({
                where: { id },
                include: { _count: { select: { items: true } } },
            })

            if (!product) {
                throw Object.assign(new Error('المنتج غير موجود'), { code: 'P2025' })
            }
            if (product._count.items > 0) {
                throw new Error(
                    `لا يمكن حذف المنتج — لديه ${product._count.items} صنف مرتبط. قم بإلغاء الربط أولاً.`
                )
            }

            await prisma.product.delete({ where: { id } })
            return product
        },
        REVALIDATE_PATHS,
        'تعذّر حذف المنتج'
    )
}
