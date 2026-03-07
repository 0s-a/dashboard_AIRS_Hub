'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { ContactInput } from '@/lib/person-types'

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
                source: true,
                contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
                tags: true,
                currencies: true,
                groupName: true,
                groupNumber: true,
                isActive: true,
                lastInteraction: true,
                createdAt: true,
                updatedAt: true,
                personType: true,
                priceLabels: {
                    include: {
                        priceLabel: true
                    }
                }
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
    source?: string | null
    contacts?: ContactInput[] | null
    tags?: string[] | null
    personTypeId?: string | null
    priceLabelIds?: string[] | null
    currencyIds?: string[] | null
    groupName?: string | null
    groupNumber?: string | null
}

export async function createPerson(data: CreatePersonData) {
    try {
        let finalPersonTypeId = data.personTypeId || null

        if (!finalPersonTypeId) {
            const defaultType = await prisma.personType.findFirst({
                where: { isDefault: true }
            })
            if (defaultType) {
                finalPersonTypeId = defaultType.id
            }
        }

        const person = await prisma.person.create({
            data: {
                name: data.name,
                address: data.address,
                notes: data.notes,
                personTypeId: finalPersonTypeId,
                source: data.source,
                contacts: data.contacts && data.contacts.length > 0 ? {
                    create: data.contacts.filter(c => c.value?.trim()).map(c => ({
                        type: c.type,
                        value: c.value.trim(),
                        label: c.label || null,
                        isPrimary: c.isPrimary || false,
                    }))
                } : undefined,
                tags: data.tags as any,
                currencies: data.currencyIds as any,
                groupName: data.groupName || null,
                groupNumber: data.groupNumber || null,
                lastInteraction: new Date(),
                priceLabels: data.priceLabelIds && data.priceLabelIds.length > 0 ? {
                    create: data.priceLabelIds.map(id => ({
                        priceLabel: { connect: { id } }
                    }))
                } : undefined
            }
        })
        revalidatePath('/dashboard/persons')
        return { success: true, data: person }
    } catch (error: any) {
        console.error('Failed to create person:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return { success: false, error: 'رقم الهاتف أو البريد مسجل بالفعل لشخص آخر' }
        }
        return { success: false, error: 'تعذّر إنشاء الشخص' }
    }
}

export interface UpdatePersonData {
    name?: string
    address?: string | null
    notes?: string | null
    source?: string | null
    contacts?: ContactInput[] | null
    tags?: string[] | null
    personTypeId?: string | null
    priceLabelIds?: string[] | null
    currencyIds?: string[] | null
    groupName?: string | null
    groupNumber?: string | null
}

export async function updatePerson(id: string, data: UpdatePersonData) {
    try {
        const person = await prisma.person.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                notes: data.notes,
                personTypeId: data.personTypeId !== undefined ? data.personTypeId || null : undefined,
                source: data.source,
                ...(data.contacts !== undefined && {
                    contacts: {
                        deleteMany: {},
                        create: (data.contacts || []).filter(c => c.value?.trim()).map(c => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                    }
                }),
                tags: data.tags !== undefined ? data.tags as any : undefined,
                currencies: data.currencyIds !== undefined ? data.currencyIds as any : undefined,
                groupName: data.groupName !== undefined ? data.groupName || null : undefined,
                groupNumber: data.groupNumber !== undefined ? data.groupNumber || null : undefined,
                lastInteraction: new Date(),
                ...(data.priceLabelIds !== undefined && {
                    priceLabels: {
                        deleteMany: {},
                        create: data.priceLabelIds ? data.priceLabelIds.map(pid => ({
                            priceLabel: { connect: { id: pid } }
                        })) : []
                    }
                })
            }
        })
        revalidatePath('/dashboard/persons')
        return { success: true, data: person }
    } catch (error: any) {
        console.error('Failed to update person:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return { success: false, error: 'رقم الهاتف أو البريد مسجل بالفعل لشخص آخر' }
        }
        return { success: false, error: 'تعذّر تحديث بيانات الشخص' }
    }
}
