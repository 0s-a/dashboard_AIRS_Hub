'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getPriceLabels() {
    try {
        const labels = await prisma.priceLabel.findMany({
            orderBy: { name: 'asc' },
        })
        return { success: true, data: labels }
    } catch (error) {
        console.error('Failed to fetch price labels:', error)
        return { success: false, error: 'Failed to fetch price labels', data: [] as any[] }
    }
}

export async function getPriceLabelById(id: string) {
    try {
        const label = await prisma.priceLabel.findUnique({
            where: { id },
        })
        return { success: true, data: label }
    } catch (error) {
        console.error('Failed to fetch price label:', error)
        return { success: false, error: 'Failed to fetch price label', data: null }
    }
}

export async function createPriceLabel(data: {
    name: string
    notes?: string | null
}) {
    try {
        const label = await prisma.priceLabel.create({
            data: {
                name: data.name,
                notes: data.notes,
            }
        })
        revalidatePath('/price-labels')
        return { success: true, data: label }
    } catch (error: any) {
        console.error('Failed to create price label:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'اسم التسعيرة موجود بالفعل' }
        }
        return { success: false, error: 'Failed to create price label' }
    }
}

export async function updatePriceLabel(id: string, data: {
    name?: string
    notes?: string | null
}) {
    try {
        const label = await prisma.priceLabel.update({
            where: { id },
            data: {
                name: data.name,
                notes: data.notes,
            }
        })
        revalidatePath('/price-labels')
        return { success: true, data: label }
    } catch (error: any) {
        console.error('Failed to update price label:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'اسم التسعيرة موجود بالفعل' }
        }
        return { success: false, error: 'Failed to update price label' }
    }
}

export async function deletePriceLabel(id: string) {
    try {
        const label = await prisma.priceLabel.findUnique({
            where: { id },
        })

        if (!label) {
            return { success: false, error: 'التسعيرة غير موجودة' }
        }

        await prisma.priceLabel.delete({
            where: { id },
        })

        revalidatePath('/price-labels')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete price label:', error)
        return { success: false, error: 'Failed to delete price label' }
    }
}
