'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import type { BrandPayload } from '@/lib/types/brand'

// Paths to revalidate after any write operation
const REVALIDATE_PATHS = ['/brands', '/inventory']

// ─── READ ─────────────────────────────────────────────────────

/** Fetch all brands ordered alphabetically, including product count */
export async function getBrands() {
    return safeAction(
        () => prisma.brand.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { products: true } } },
        }),
        'تعذّر جلب البراندات'
    )
}

/** Fetch a single brand by ID */
export async function getBrandById(id: string) {
    return safeAction(
        () => prisma.brand.findUnique({
            where: { id },
            include: { _count: { select: { products: true } } },
        }),
        'تعذّر جلب البراند'
    )
}

// ─── WRITE ────────────────────────────────────────────────────

/** Create a new brand. Code is always stored uppercase. */
export async function createBrand(data: BrandPayload) {
    return safeActionWithRevalidation(
        () => prisma.brand.create({
            data: {
                name:        data.name.trim(),
                code:        data.code.trim().toUpperCase(),
                logo:        data.logo        ?? null,
                description: data.description?.trim() ?? null,
            },
        }),
        REVALIDATE_PATHS,
        'تعذّر إنشاء البراند'
    )
}

/** Update an existing brand by ID. */
export async function updateBrand(id: string, data: BrandPayload) {
    return safeActionWithRevalidation(
        () => prisma.brand.update({
            where: { id },
            data: {
                name:        data.name.trim(),
                code:        data.code.trim().toUpperCase(),
                logo:        data.logo        ?? null,
                description: data.description?.trim() ?? null,
            },
        }),
        REVALIDATE_PATHS,
        'تعذّر تعديل البراند'
    )
}

/**
 * Delete a brand by ID.
 * Throws if the brand has linked products — caller must handle this case.
 */
export async function deleteBrand(id: string) {
    return safeActionWithRevalidation(
        async () => {
            const brand = await prisma.brand.findUnique({
                where: { id },
                include: { _count: { select: { products: true } } },
            })

            if (!brand) {
                throw Object.assign(new Error('البراند غير موجود'), { code: 'P2025' })
            }
            if (brand._count.products > 0) {
                throw new Error(
                    `لا يمكن حذف البراند — لديه ${brand._count.products} منتج مرتبط. قم بإلغاء الربط أولاً.`
                )
            }

            await prisma.brand.delete({ where: { id } })
            return brand
        },
        REVALIDATE_PATHS,
        'تعذّر حذف البراند'
    )
}
