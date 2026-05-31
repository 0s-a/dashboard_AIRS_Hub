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
 * Returns true if the current user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
    const res = await getCurrentUser()
    return res.success && !!res.data?.userId
}
