'use server'

import { getCurrentUser } from '@/lib/actions/auth'

/**
 * Returns true if the current user is an admin.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
    const res = await getCurrentUser()
    return res.success && res.data?.role === 'admin'
}

/**
 * Throws an error if the current user is NOT an admin.
 * Use inside safeAction / safeActionWithRevalidation callbacks.
 */
export async function requireAdmin(): Promise<void> {
    const ok = await isCurrentUserAdmin()
    if (!ok) {
        throw new Error('صلاحية مرفوضة — هذه العملية للمدير فقط')
    }
}
