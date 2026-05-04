'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { getCurrentUser } from '@/lib/actions/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

const PATHS = '/users'
const SALT_ROUNDS = 12

// نوع جهة الاتصال
export interface UserContactInput {
    type: 'phone' | 'email' | 'whatsapp'
    value: string
    label?: string
    isPrimary?: boolean
}

// ─── Read ───────────────────────────────────────────────────

export async function getUsers() {
    return safeAction(
        () => prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                color: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                contacts: {
                    select: {
                        id: true,
                        type: true,
                        value: true,
                        label: true,
                        isPrimary: true,
                    },
                    orderBy: { isPrimary: 'desc' },
                },
            },
        }),
        'تعذّر جلب المستخدمين'
    )
}

// ─── Create (admin only) ────────────────────────────────────

export async function createUser(data: {
    name: string
    username: string
    password: string
    role?: string
    color?: string
}) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            if (data.password.length < 4) {
                throw new Error('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
            }
            const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)
            return prisma.user.create({
                data: {
                    name:     data.name.trim(),
                    username: data.username.trim().toLowerCase(),
                    password: hashedPassword,
                    role:     data.role  || 'user',
                    color:    data.color || '#6366f1',
                },
                select: {
                    id: true, name: true, username: true,
                    role: true, color: true, isActive: true,
                    createdAt: true, updatedAt: true,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء المستخدم'
    )
}

// ─── Update (admin only) ────────────────────────────────────

export async function updateUser(id: string, data: {
    name?: string
    username?: string
    password?: string
    role?: string
    color?: string
}) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            const updateData: Record<string, string> = {}
            if (data.name)     updateData.name     = data.name.trim()
            if (data.username) updateData.username = data.username.trim().toLowerCase()
            if (data.role)     updateData.role     = data.role
            if (data.color)    updateData.color    = data.color
            if (data.password) {
                if (data.password.length < 4) {
                    throw new Error('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
                }
                updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS)
            }
            return prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true, name: true, username: true,
                    role: true, color: true, isActive: true,
                    createdAt: true, updatedAt: true,
                },
            })
        },
        PATHS,
        'تعذّر تحديث المستخدم'
    )
}

// ─── Delete (admin only) ────────────────────────────────────

export async function deleteUser(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            // Prevent self-deletion
            const currentUser = await getCurrentUser()
            if (currentUser.success && currentUser.data?.userId === id) {
                throw new Error('لا يمكنك حذف حسابك الحالي')
            }
            // Prevent deleting last active user
            const activeCount = await prisma.user.count({ where: { isActive: true } })
            const user = await prisma.user.findUnique({ where: { id } })
            if (activeCount <= 1 && user?.isActive) {
                throw new Error('لا يمكن حذف آخر مستخدم نشط في النظام')
            }
            await prisma.user.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر حذف المستخدم'
    )
}

// ─── Toggle Active (admin only) ─────────────────────────────

export async function toggleUserActive(id: string, isActive: boolean) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            if (!isActive) {
                const currentUser = await getCurrentUser()
                if (currentUser.success && currentUser.data?.userId === id) {
                    throw new Error('لا يمكنك تعطيل حسابك الحالي')
                }
                const activeCount = await prisma.user.count({ where: { isActive: true } })
                if (activeCount <= 1) {
                    throw new Error('لا يمكن تعطيل آخر مستخدم نشط في النظام')
                }
            }
            return prisma.user.update({
                where: { id },
                data: { isActive },
                select: {
                    id: true, name: true, username: true,
                    role: true, color: true, isActive: true,
                    createdAt: true, updatedAt: true,
                },
            })
        },
        PATHS,
        'تعذّر تغيير حالة المستخدم'
    )
}

// ─── Contacts (admin only) ──────────────────────────────────────────────────

/** إضافة جهة اتصال لمستخدم */
export async function addUserContact(userId: string, contact: UserContactInput) {
    try {
        await requireAdmin()
        const result = await prisma.contact.create({
            data: {
                userId,
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
            return { success: false, error: 'هذا الرقم/البريد مسجّل بالفعل لهذا المستخدم' }
        }
        return { success: false, error: 'تعذّر إضافة جهة الاتصال' }
    }
}

/** حذف جهة اتصال مستخدم */
export async function deleteUserContact(contactId: string) {
    try {
        await requireAdmin()
        await prisma.contact.delete({ where: { id: contactId } })
        revalidatePath(PATHS)
        return { success: true }
    } catch {
        return { success: false, error: 'تعذّر حذف جهة الاتصال' }
    }
}

/** استبدال كل جهات اتصال مستخدم (يُستخدم عند الحفظ من نموذج التعديل) */
export async function replaceUserContacts(userId: string, contacts: UserContactInput[]) {
    try {
        await requireAdmin()
        await prisma.$transaction([
            // حذف القديم
            prisma.contact.deleteMany({ where: { userId } }),
            // إنشاء الجديد
            ...contacts
                .filter(c => c.value?.trim())
                .map(c => prisma.contact.create({
                    data: {
                        userId,
                        type: c.type,
                        value: c.value.trim(),
                        label: c.label || null,
                        isPrimary: c.isPrimary ?? false,
                    },
                })),
        ])
        revalidatePath(PATHS)
        return { success: true }
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return { success: false, error: 'يوجد رقم أو بريد مكرر في قائمة الاتصال' }
        }
        return { success: false, error: 'تعذّر تحديث جهات الاتصال' }
    }
}
