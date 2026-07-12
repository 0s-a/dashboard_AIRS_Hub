'use server'

import { getCurrentUser } from '@/lib/actions/auth'

/**
 * Throws an error if the user is not authenticated.
 * Use inside safeAction / safeActionWithRevalidation callbacks.
 */
export async function requireAuth(): Promise<void> {
    const res = await getCurrentUser()
    if (!res.success || !res.data?.userId) {
        throw new Error('يجب تسجيل الدخول للقيام بهذه العملية')
    }
}

/**
 * @deprecated Use requireAuth() — all dashboard users have equal access; no role system.
 */
export async function requireAdmin(): Promise<void> {
    await requireAuth()
}
