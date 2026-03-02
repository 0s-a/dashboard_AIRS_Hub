'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ContactItem } from '@/lib/person-types'

export async function softDeletePerson(id: string) {
    try {
        const person = await prisma.person.update({
            where: { id },
            data: { isActive: false },
        })
        revalidatePath('/dashboard/persons')
        return { success: true, data: person }
    } catch (error) {
        console.error('Failed to soft delete person:', error)
        return { success: false, error: 'تعذّر حذف الشخص' }
    }
}

export async function hardDeletePerson(id: string) {
    try {
        await prisma.person.delete({
            where: { id },
        })
        revalidatePath('/dashboard/persons')
        return { success: true }
    } catch (error) {
        console.error('Failed to permanently delete person:', error)
        return { success: false, error: 'تعذّر الحذف النهائي للشخص' }
    }
}

export async function togglePersonActive(id: string, isActive: boolean) {
    try {
        const person = await prisma.person.update({
            where: { id },
            data: { isActive },
        })
        revalidatePath('/dashboard/persons')
        return { success: true, data: person }
    } catch (error) {
        console.error('Failed to toggle person status:', error)
        return { success: false, error: 'تعذّر تحديث حالة الشخص' }
    }
}

export async function getPersons() {
    try {
        const persons = await prisma.person.findMany({
            orderBy: { lastInteraction: 'desc' },
            select: {
                id: true,
                name: true,
                address: true,
                notes: true,
                type: true,
                source: true,
                contacts: true,
                tags: true,
                isActive: true,
                lastInteraction: true,
                createdAt: true,
                updatedAt: true,
                groups: true // Added groups
            }
        })
        return { success: true, data: persons }
    } catch (error) {
        console.error('Failed to fetch persons:', error)
        return { success: false, error: 'تعذّر جلب قائمة الأشخاص', data: [] }
    }
}

export interface CreatePersonData {
    name: string
    address?: string | null
    notes?: string | null
    type?: string | null
    source?: string | null
    contacts?: ContactItem[] | null
    tags?: string[] | null
}

export async function createPerson(data: CreatePersonData) {
    try {
        const person = await prisma.person.create({
            data: {
                name: data.name,
                address: data.address,
                notes: data.notes,
                type: data.type || 'عادي',
                source: data.source,
                contacts: data.contacts as any,
                tags: data.tags as any,
                lastInteraction: new Date(),
            }
        })
        revalidatePath('/dashboard/persons')
        return { success: true, data: person }
    } catch (error) {
        console.error('Failed to create person:', error)
        return { success: false, error: 'تعذّر إنشاء الشخص' }
    }
}

export interface UpdatePersonData {
    name?: string
    address?: string | null
    notes?: string | null
    type?: string | null
    source?: string | null
    contacts?: ContactItem[] | null
    tags?: string[] | null
}

export async function updatePerson(id: string, data: UpdatePersonData) {
    try {
        const person = await prisma.person.update({
            where: { id },
            data: {
                ...data,
                contacts: data.contacts as any,
                tags: data.tags as any,
                lastInteraction: new Date(),
            }
        })
        revalidatePath('/dashboard/persons')
        return { success: true, data: person }
    } catch (error) {
        console.error('Failed to update person:', error)
        return { success: false, error: 'تعذّر تحديث بيانات الشخص' }
    }
}
