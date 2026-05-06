'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'

const PATHS = ['/categories', '/inventory']

export async function getCategories() {
    return safeAction(
        () => prisma.category.findMany({
            orderBy: { name: 'asc' },
        }),
        'تعذّر جلب التصنيفات'
    )
}

export async function getCategoryById(id: string) {
    return safeAction(
        () => prisma.category.findUnique({ where: { id } }),
        'تعذّر جلب التصنيف'
    )
}

export async function createCategory(data: {
    name: string
    code: string
    description?: string | null
    icon?: string | null
}) {
    const code = data.code.toUpperCase()

    return safeActionWithRevalidation(
        () => prisma.category.create({
            data: {
                name: data.name,
                code,
                description: data.description,
                icon: data.icon,
            },
        }),
        PATHS,
        'تعذّر إنشاء التصنيف'
    )
}

export async function updateCategory(id: string, data: {
    name?: string
    code?: string
    description?: string | null
    icon?: string | null
}) {
    const code = data.code ? data.code.toUpperCase() : undefined

    return safeActionWithRevalidation(
        () => prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                code,
                description: data.description,
                icon: data.icon,
            },
        }),
        PATHS,
        'تعذّر تعديل التصنيف'
    )
}

export async function deleteCategory(id: string) {
    return safeActionWithRevalidation(
        async () => {
            const category = await prisma.category.findUnique({ where: { id } })
            if (!category) throw Object.assign(new Error('التصنيف غير موجود'), { code: 'P2025' })

            await prisma.category.delete({ where: { id } })
            return category
        },
        PATHS,
        'تعذّر حذف التصنيف'
    )
}
