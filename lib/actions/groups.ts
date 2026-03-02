'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getGroups() {
    try {
        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { persons: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: groups }
    } catch (error) {
        console.error('Failed to fetch groups:', error)
        return { success: false, error: 'تعذّر جلب المجموعات', data: [] }
    }
}

export async function getGroup(id: string) {
    try {
        const group = await prisma.group.findUnique({
            where: { id },
            include: {
                persons: {
                    orderBy: { lastInteraction: 'desc' }
                }
            }
        })
        if (!group) return { success: false, error: 'المجموعة غير موجودة' }
        return { success: true, data: group }
    } catch (error) {
        console.error('Failed to fetch group:', error)
        return { success: false, error: 'تعذّر جلب تفاصيل المجموعة' }
    }
}

export async function createGroup(data: { name: string; number: string; tags?: string[]; isActive?: boolean; category?: string | null }) {
    try {
        const group = await prisma.group.create({
            data: {
                name: data.name,
                number: data.number,
                tags: data.tags as any || [],
                isActive: data.isActive ?? true,
                category: data.category || null,
            }
        })
        revalidatePath('/groups')
        return { success: true, data: group }
    } catch (error: any) {
        console.error('Failed to create group:', error)
        if (error.code === 'P2002') return { success: false, error: 'رقم المجموعة مستخدم مسبقاً' }
        return { success: false, error: 'تعذّر إنشاء المجموعة' }
    }
}

export async function updateGroup(id: string, data: { name?: string; number?: string; tags?: string[]; isActive?: boolean; category?: string | null }) {
    try {
        const group = await prisma.group.update({
            where: { id },
            data: {
                name: data.name,
                number: data.number,
                tags: data.tags as any,
                isActive: data.isActive,
                category: data.category,
            }
        })
        revalidatePath('/groups')
        revalidatePath(`/groups/${id}`)
        return { success: true, data: group }
    } catch (error: any) {
        console.error('Failed to update group:', error)
        if (error.code === 'P2002') return { success: false, error: 'رقم المجموعة مستخدم مسبقاً' }
        return { success: false, error: 'تعذّر تحديث المجموعة' }
    }
}

export async function deleteGroup(id: string) {
    try {
        await prisma.group.delete({
            where: { id }
        })
        revalidatePath('/groups')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete group:', error)
        return { success: false, error: 'تعذّر حذف المجموعة' }
    }
}

export async function toggleGroupActive(id: string, isActive: boolean) {
    try {
        const group = await prisma.group.update({
            where: { id },
            data: { isActive },
        })
        revalidatePath('/groups')
        return { success: true, data: group }
    } catch (error) {
        console.error('Failed to toggle group status:', error)
        return { success: false, error: 'تعذّر تحديث حالة المجموعة' }
    }
}

export async function togglePersonInGroup(personId: string, groupId: string) {
    try {
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { persons: { select: { id: true } } }
        })

        if (!group) return { success: false, error: 'المجموعة غير موجودة' }

        const isLinked = group.persons.some((p: any) => p.id === personId)

        if (isLinked) {
            await prisma.group.update({
                where: { id: groupId },
                data: {
                    persons: { disconnect: { id: personId } }
                }
            })
        } else {
            await prisma.group.update({
                where: { id: groupId },
                data: {
                    persons: { connect: { id: personId } }
                }
            })
        }

        revalidatePath('/dashboard/groups')
        revalidatePath(`/dashboard/groups/${groupId}`)
        revalidatePath('/dashboard/persons')

        return { success: true, linked: !isLinked }
    } catch (error) {
        console.error('Failed to toggle person in group:', error)
        return { success: false, error: 'فشل ربط/فك ربط الشخص بالمجموعة' }
    }
}
