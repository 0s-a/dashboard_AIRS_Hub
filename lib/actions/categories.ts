'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import { PRODUCT_CODE_CONFIG } from '@/lib/config/product-code.config'

const PATHS = ['/categories', '/products']

function assertCategoryCode(code: string) {
    if (!PRODUCT_CODE_CONFIG.category.pattern.test(code)) {
        throw new Error(`كود التصنيف يجب أن يكون من ${PRODUCT_CODE_CONFIG.category.minLength} إلى ${PRODUCT_CODE_CONFIG.category.maxLength} خانات (أحرف أو أرقام إنجليزية)`)
    }
}

export async function getCategories() {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.category.findMany({
                orderBy: { name: 'asc' },
            })
        },
        'تعذّر جلب التصنيفات'
    )
}

export async function createCategory(data: {
    name: string
    code: string
    description?: string | null
}) {
    const code = data.code.toUpperCase()
    assertCategoryCode(code)

    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.category.create({
                data: {
                    name: data.name,
                    code,
                    description: data.description,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء التصنيف'
    )
}

export async function updateCategory(id: string, data: {
    name?: string
    code?: string
    description?: string | null
}) {
    const code = data.code ? data.code.toUpperCase() : undefined
    if (code) assertCategoryCode(code)

    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.category.update({
                where: { id },
                data: {
                    name: data.name,
                    code,
                    description: data.description,
                },
            })
        },
        PATHS,
        'تعذّر تعديل التصنيف'
    )
}

export async function deleteCategory(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const category = await prisma.category.findUnique({ where: { id } })
            if (!category) throw Object.assign(new Error('التصنيف غير موجود'), { code: 'P2025' })

            await prisma.category.delete({ where: { id } })
            return category
        },
        PATHS,
        'تعذّر حذف التصنيف'
    )
}
