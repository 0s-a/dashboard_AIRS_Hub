'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { ProductFamilyPayload } from '@/lib/types/product-family'
import { upsertProductsToMeilisearch } from '@/lib/utils/meilisearch-sync'

const REVALIDATE_PATHS = ['/product-families', '/products']

const FAMILY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/

function normalizeFamilyCode(raw: string): string {
    return raw.trim().toUpperCase()
}

function validateFamilyPayload(data: ProductFamilyPayload) {
    const name = data.name?.trim()
    if (!name) throw new Error('اسم المنتج الرئيسي مطلوب')

    const code = normalizeFamilyCode(data.code ?? '')
    if (!code) throw new Error('كود المنتج الرئيسي مطلوب')
    if (!FAMILY_CODE_PATTERN.test(code)) {
        throw new Error('كود المنتج الرئيسي: حروف/أرقام إنجليزية، ويمكن شرطة أو شرطة سفلية (حتى 32 خانة)')
    }

    return {
        name,
        code,
        description: data.description?.trim() || null,
    }
}

function reindexFamilyProducts(familyId: string) {
    void prisma.product
        .findMany({
            where: { familyId },
            select: { id: true },
        })
        .then(products => {
            if (products.length === 0) return
            return upsertProductsToMeilisearch(products.map(p => p.id))
        })
        .catch(console.warn)
}

// ─── READ ─────────────────────────────────────────────────────

/** Fetch all product families ordered alphabetically, including product count */
export async function getProductFamilies() {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.productFamily.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { products: true } } },
            })
        },
        'تعذّر جلب المنتجات الرئيسية'
    )
}

// ─── WRITE ────────────────────────────────────────────────────

/** Create a new product family. Code is always stored uppercase. */
export async function createProductFamily(data: ProductFamilyPayload) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validateFamilyPayload(data)
            return prisma.productFamily.create({ data: payload })
        },
        REVALIDATE_PATHS,
        'تعذّر إنشاء المنتج الرئيسي'
    )
}

/** Update an existing product family by ID. Re-indexes linked products in Meili. */
export async function updateProductFamily(id: string, data: ProductFamilyPayload) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validateFamilyPayload(data)
            const updated = await prisma.productFamily.update({
                where: { id },
                data: payload,
            })
            reindexFamilyProducts(id)
            return updated
        },
        REVALIDATE_PATHS,
        'تعذّر تعديل المنتج الرئيسي'
    )
}

/**
 * Delete a product family by ID.
 * Rejects if any products are linked.
 */
export async function deleteProductFamily(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const family = await prisma.productFamily.findUnique({
                where: { id },
                include: { _count: { select: { products: true } } },
            })

            if (!family) {
                throw Object.assign(new Error('المنتج الرئيسي غير موجود'), { code: 'P2025' })
            }
            if (family._count.products > 0) {
                throw new Error(
                    `لا يمكن حذف المنتج الرئيسي — لديه ${family._count.products} منتج مرتبط. قم بإلغاء الربط أولاً.`
                )
            }

            await prisma.productFamily.delete({ where: { id } })
            return family
        },
        REVALIDATE_PATHS,
        'تعذّر حذف المنتج الرئيسي'
    )
}
