'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import type { ContactInput } from '@/lib/config/contact.config'

const PATHS = '/supervisors'

/** Supervisor contact input — uses the same centralized type as Customer */
export type SupervisorContactInput = ContactInput

// ─── Read ────────────────────────────────────────────────────

export async function getSupervisors(options?: {
    page?: number
    pageSize?: number
    search?: string
    activeOnly?: boolean
}) {
    const { page = 1, pageSize = 100, search, activeOnly = true } = options ?? {}

    return safeAction(async () => {
        const where: any = {
            ...(activeOnly && { isActive: true }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { contacts: { some: { value: { contains: search } } } },
                    { notes: { contains: search, mode: 'insensitive' } },
                ],
            }),
        }

        const [supervisors, total] = await Promise.all([
            prisma.supervisor.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    name: true,
                    notes: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    contacts: {
                        select: { id: true, type: true, value: true, label: true, isPrimary: true },
                        orderBy: { isPrimary: 'desc' },
                    },
                },
            }),
            prisma.supervisor.count({ where }),
        ])
        return { supervisors, total, page, pageSize }
    }, 'تعذّر جلب المشرفين')
}

export async function getSupervisorById(id: string) {
    return safeAction(
        () => prisma.supervisor.findUniqueOrThrow({
            where: { id },
            include: { contacts: true },
        }),
        'تعذّر جلب بيانات المشرف'
    )
}

// ─── Create ─────────────────────────────────────────────────

export async function createSupervisor(data: {
    name: string
    notes?: string
    contacts?: SupervisorContactInput[]
}) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.supervisor.create({
                data: {
                    name: data.name.trim(),
                    notes: data.notes?.trim() || null,
                    contacts: data.contacts && data.contacts.length > 0 ? {
                        create: data.contacts
                            .filter(c => c.value?.trim())
                            .map(c => ({
                                type: c.type,
                                value: c.value.trim(),
                                label: c.label || null,
                                isPrimary: c.isPrimary ?? false,
                            })),
                    } : undefined,
                },
                include: { contacts: true },
            })
        },
        PATHS,
        'تعذّر إنشاء المشرف'
    )
}

// ─── Update ─────────────────────────────────────────────────

export async function updateSupervisor(id: string, data: {
    name?: string
    notes?: string | null
    contacts?: SupervisorContactInput[] | null
}) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            try {
                return await prisma.supervisor.update({
                    where: { id },
                    data: {
                        name: data.name?.trim(),
                        notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
                        ...(data.contacts !== undefined && {
                            contacts: {
                                deleteMany: {},
                                create: (data.contacts || [])
                                    .filter(c => c.value?.trim())
                                    .map(c => ({
                                        type: c.type,
                                        value: c.value.trim(),
                                        label: c.label || null,
                                        isPrimary: c.isPrimary ?? false,
                                    })),
                            },
                        }),
                    },
                    include: { contacts: true },
                })
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    const constraint = err?.meta?.target as string | string[] | undefined
                    const name = Array.isArray(constraint) ? constraint.join(',') : constraint
                    if (name?.includes('value')) {
                        throw new Error('هذا الرقم/البريد مسجّل بالفعل في النظام لعميل أو مشرف آخر')
                    }
                    if (name?.includes('supervisor_type')) {
                        throw new Error('لا يمكن إضافة أكثر من وسيلة اتصال واحدة من نفس النوع')
                    }
                    throw new Error('بيانات مكررة — تأكد من عدم تكرار المعلومات')
                }
                throw err
            }
        },
        PATHS,
        'تعذّر تحديث بيانات المشرف'
    )
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteSupervisor(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            await prisma.supervisor.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر حذف المشرف'
    )
}

// ─── Toggle Active ───────────────────────────────────────────

export async function toggleSupervisorActive(id: string, isActive: boolean) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.supervisor.update({
                where: { id },
                data: { isActive },
                select: { id: true, name: true, isActive: true },
            })
        },
        PATHS,
        'تعذّر تغيير حالة المشرف'
    )
}

// ─── Contacts ───────────────────────────────────────────────

export async function addSupervisorContact(supervisorId: string, contact: SupervisorContactInput) {
    try {
        await requireAuth()
        const result = await prisma.contact.create({
            data: {
                supervisorId,
                type: contact.type,
                value: contact.value.trim(),
                label: contact.label || null,
                isPrimary: contact.isPrimary ?? false,
            },
        })
        revalidatePath(PATHS)
        return { success: true, data: result }
    } catch (error: any) {
        if (error?.code === 'P2002') {
            const constraint = error?.meta?.target as string | string[] | undefined
            const name = Array.isArray(constraint) ? constraint.join(',') : constraint
            if (name?.includes('value')) {
                return { success: false, error: 'هذا الرقم/البريد مسجّل بالفعل في النظام' }
            }
            if (name?.includes('supervisor_type')) {
                return { success: false, error: 'لا يمكن إضافة أكثر من وسيلة اتصال واحدة من نفس النوع' }
            }
            return { success: false, error: 'بيانات مكررة — تأكد من عدم تكرار المعلومات' }
        }
        return { success: false, error: 'تعذّر إضافة جهة الاتصال' }
    }
}

export async function deleteSupervisorContact(contactId: string) {
    try {
        await requireAuth()
        await prisma.contact.delete({ where: { id: contactId } })
        revalidatePath(PATHS)
        return { success: true }
    } catch {
        return { success: false, error: 'تعذّر حذف جهة الاتصال' }
    }
}
