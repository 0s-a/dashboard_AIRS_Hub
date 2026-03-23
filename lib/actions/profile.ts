'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { safeActionWithRevalidation } from '@/lib/action-utils'
import { getCurrentUser } from '@/lib/actions/auth'

const PATHS = '/profile'
const SALT_ROUNDS = 12

// ─── Update Profile (self) ──────────────────────────────────

export async function updateProfile(data: { name?: string; color?: string }) {
    return safeActionWithRevalidation(
        async () => {
            const currentUser = await getCurrentUser()
            if (!currentUser.success || !currentUser.data) {
                throw new Error('يرجى تسجيل الدخول أولاً')
            }
            const updateData: Record<string, string> = {}
            if (data.name?.trim())  updateData.name  = data.name.trim()
            if (data.color?.trim()) updateData.color = data.color.trim()

            return prisma.user.update({
                where: { id: currentUser.data.userId },
                data: updateData,
                select: { id: true, name: true, username: true, role: true, color: true },
            })
        },
        PATHS,
        'تعذّر تحديث الملف الشخصي'
    )
}

// ─── Change Password (self) ──────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string) {
    return safeActionWithRevalidation(
        async () => {
            const currentUser = await getCurrentUser()
            if (!currentUser.success || !currentUser.data) {
                throw new Error('يرجى تسجيل الدخول أولاً')
            }
            if (newPassword.length < 4) {
                throw new Error('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل')
            }

            // Fetch fresh password hash from DB
            const user = await prisma.user.findUnique({
                where: { id: currentUser.data.userId },
                select: { password: true },
            })
            if (!user) throw new Error('المستخدم غير موجود')

            const isValid = await bcrypt.compare(currentPassword, user.password)
            if (!isValid) throw new Error('كلمة المرور الحالية غير صحيحة')

            const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS)
            await prisma.user.update({
                where: { id: currentUser.data.userId },
                data: { password: hashed },
            })
            return null
        },
        PATHS,
        'تعذّر تغيير كلمة المرور'
    )
}
