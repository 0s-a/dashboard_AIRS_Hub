'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getPersonTypes() {
    try {
        const types = await (prisma as any).personType.findMany({
            orderBy: { name: 'asc' },
        })
        return { success: true, data: types }
    } catch (error) {
        console.error('Failed to fetch person types:', error)
        return { success: false, error: 'Failed to fetch person types', data: [] as any[] }
    }
}

export async function getPersonTypeById(id: string) {
    try {
        const type = await (prisma as any).personType.findUnique({
            where: { id },
        })
        return { success: true, data: type }
    } catch (error) {
        console.error('Failed to fetch person type:', error)
        return { success: false, error: 'Failed to fetch person type', data: null }
    }
}

export async function createPersonType(data: {
    name: string
    description?: string | null
    color?: string | null
    icon?: string | null
    notes?: string | null
    isDefault?: boolean
}) {
    try {
        if (data.isDefault) {
            await (prisma as any).personType.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            })
        }
        const type = await (prisma as any).personType.create({
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                notes: data.notes,
                isDefault: data.isDefault || false,
            }
        })
        revalidatePath('/person-types')
        return { success: true, data: type }
    } catch (error: any) {
        console.error('Failed to create person type:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'اسم النوع موجود بالفعل' }
        }
        return { success: false, error: 'Failed to create person type' }
    }
}

export async function updatePersonType(id: string, data: {
    name?: string
    description?: string | null
    color?: string | null
    icon?: string | null
    notes?: string | null
    isDefault?: boolean
}) {
    try {
        if (data.isDefault) {
            await (prisma as any).personType.updateMany({
                where: { id: { not: id }, isDefault: true },
                data: { isDefault: false }
            })
        }
        const type = await (prisma as any).personType.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                notes: data.notes,
                ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
            }
        })
        revalidatePath('/person-types')
        return { success: true, data: type }
    } catch (error: any) {
        console.error('Failed to update person type:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'اسم النوع موجود بالفعل' }
        }
        return { success: false, error: 'Failed to update person type' }
    }
}
