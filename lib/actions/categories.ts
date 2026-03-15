'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'

const PATHS = ['/categories', '/inventory']

export async function getCategories(activeOnly: boolean = false) {
    return safeAction(
        () => prisma.category.findMany({
            where: activeOnly ? { isActive: true } : undefined,
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
    description?: string | null
    icon?: string | null
    isActive?: boolean
}) {
    return safeActionWithRevalidation(
        () => prisma.category.create({
            data: {
                name: data.name,
                description: data.description,
                icon: data.icon,
                isActive: data.isActive ?? true,
            },
        }),
        PATHS,
        'تعذّر إنشاء التصنيف'
    )
}

export async function updateCategory(id: string, data: {
    name?: string
    description?: string | null
    icon?: string | null
    isActive?: boolean
}) {
    return safeActionWithRevalidation(
        () => prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                icon: data.icon,
                isActive: data.isActive,
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

export async function toggleCategoryStatus(id: string, currentStatus: boolean) {
    return safeActionWithRevalidation(
        () => prisma.category.update({
            where: { id },
            data: { isActive: !currentStatus },
        }),
        PATHS,
        'تعذّر تغيير حالة التصنيف'
    )
}
