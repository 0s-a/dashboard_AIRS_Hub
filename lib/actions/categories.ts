'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getCategories(activeOnly: boolean = false) {
    try {
        const categories = await prisma.category.findMany({
            where: activeOnly ? { isActive: true } : undefined,

            orderBy: { name: 'asc' },
        })
        return { success: true, data: categories }
    } catch (error) {
        console.error('Failed to fetch categories:', error)
        return { success: false, error: 'Failed to fetch categories', data: [] as any[] }
    }
}

export async function getCategoryById(id: string) {
    try {
        const category = await prisma.category.findUnique({
            where: { id },

        })
        return { success: true, data: category }
    } catch (error) {
        console.error('Failed to fetch category:', error)
        return { success: false, error: 'Failed to fetch category', data: null }
    }
}

export async function createCategory(data: {
    name: string
    description?: string | null
    icon?: string | null
    isActive?: boolean
}) {
    try {
        const category = await prisma.category.create({
            data: {
                name: data.name,
                description: data.description,
                icon: data.icon,
                isActive: data.isActive ?? true,
            }
        })
        revalidatePath('/categories')
        revalidatePath('/inventory')
        return { success: true, data: category }
    } catch (error: any) {
        console.error('Failed to create category:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'اسم التصنيف موجود بالفعل' }
        }
        return { success: false, error: 'Failed to create category' }
    }
}

export async function updateCategory(id: string, data: {
    name?: string
    description?: string | null
    icon?: string | null
    isActive?: boolean
}) {
    try {
        const category = await prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                icon: data.icon,
                isActive: data.isActive,
            }
        })
        revalidatePath('/categories')
        revalidatePath('/inventory')
        return { success: true, data: category }
    } catch (error: any) {
        console.error('Failed to update category:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'اسم التصنيف موجود بالفعل' }
        }
        return { success: false, error: 'Failed to update category' }
    }
}

export async function deleteCategory(id: string) {
    try {
        // Check if category has products
        const category = await prisma.category.findUnique({
            where: { id },

        })

        if (!category) {
            return { success: false, error: 'التصنيف غير موجود' }
        }



        await prisma.category.delete({
            where: { id },
        })

        revalidatePath('/categories')
        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete category:', error)
        return { success: false, error: 'Failed to delete category' }
    }
}

export async function toggleCategoryStatus(id: string, currentStatus: boolean) {
    try {
        const updatedCategory = await prisma.category.update({
            where: { id },
            data: { isActive: !currentStatus },
        })

        revalidatePath('/categories')
        revalidatePath('/inventory')

        return { success: true, data: updatedCategory }
    } catch (error) {
        console.error('Failed to toggle category status:', error)
        return { success: false, error: 'Failed to update status' }
    }
}
