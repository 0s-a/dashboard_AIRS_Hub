// ─────────────────────────────────────────────────────────────────────────────
// Route Handler auth helper — reads JWT cookie directly (no 'use server')
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { AUTH_CONFIG } from '@/lib/auth-config'
import { apiError } from '@/lib/api-utils'
import type { NextRequest } from 'next/server'

const secret = new TextEncoder().encode(AUTH_CONFIG.jwtSecret)

/**
 * Verifies the dashboard auth cookie in a Route Handler context.
 * Returns null if valid, or an error Response if unauthorized.
 */
export async function requireDashboardAuth(): Promise<Response | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get(AUTH_CONFIG.tokenName)?.value

        if (!token) return apiError('Unauthorized', 401)

        await jwtVerify(token, secret)
        return null // authenticated
    } catch {
        return apiError('Unauthorized', 401)
    }
}
