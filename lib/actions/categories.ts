'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'

import { uniqueCategorySlug } from '@/lib/utils/slug'
import { PRODUCT_CODE_CONFIG } from '@/lib/config/product-code.config'

const PATHS = ['/categories', '/products', '/inventory']

function assertCategoryCode(code: string) {
    if (!PRODUCT_CODE_CONFIG.category.pattern.test(code)) {
        throw new Error('كود التصنيف يجب أن يكون حرفين إنجليزية أو أرقام')
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
    icon?: string | null
    parentId?: string | null
}) {
    const code = data.code.toUpperCase()
    assertCategoryCode(code)
    const slug = await uniqueCategorySlug(data.name)

    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.category.create({
            data: {
                name: data.name,
                code,
                slug,
                parentId: data.parentId ?? null,
                description: data.description,
                icon: data.icon,
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
    icon?: string | null
    parentId?: string | null
}) {
    const code = data.code ? data.code.toUpperCase() : undefined
    if (code) assertCategoryCode(code)
    const slug = data.name ? await uniqueCategorySlug(data.name, id) : undefined

    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                code,
                slug,
                parentId: data.parentId,
                description: data.description,
                icon: data.icon,
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
