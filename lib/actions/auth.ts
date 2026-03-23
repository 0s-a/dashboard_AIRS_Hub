'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { ActionResult } from '@/lib/types'
import { AUTH_CONFIG, type JwtPayload } from '@/lib/auth-config'

// Encode secret for jose
const secret = new TextEncoder().encode(AUTH_CONFIG.jwtSecret)

// ─── Login ──────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<ActionResult<{ name: string }>> {
    try {
        if (!username?.trim() || !password?.trim()) {
            return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }
        }

        const user = await prisma.user.findUnique({
            where: { username: username.trim().toLowerCase() },
        })

        if (!user) {
            return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
        }

        if (!user.isActive) {
            return { success: false, error: 'هذا الحساب معطّل. تواصل مع المدير' }
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        })

        // Create JWT with jose (consistent with middleware)
        const token = await new SignJWT({
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            color: user.color,
        } as JwtPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(AUTH_CONFIG.tokenExpiry)
            .setIssuedAt()
            .sign(secret)

        // Set HttpOnly cookie
        const cookieStore = await cookies()
        cookieStore.set(AUTH_CONFIG.tokenName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: AUTH_CONFIG.tokenMaxAge,
            path: '/',
        })

        return { success: true, data: { name: user.name } }
    } catch (error: any) {
        console.error('[auth] login error:', error?.message)
        return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' }
    }
}

// ─── Logout ─────────────────────────────────────────────────

export async function logout(): Promise<ActionResult<null>> {
    try {
        const cookieStore = await cookies()
        cookieStore.delete(AUTH_CONFIG.tokenName)
        return { success: true, data: null }
    } catch (error: any) {
        console.error('[auth] logout error:', error?.message)
        return { success: false, error: 'حدث خطأ أثناء تسجيل الخروج' }
    }
}

// ─── Get Current User ───────────────────────────────────────

export async function getCurrentUser(): Promise<ActionResult<JwtPayload | null>> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get(AUTH_CONFIG.tokenName)?.value

        if (!token) {
            return { success: true, data: null }
        }

        const { payload } = await jwtVerify(token, secret)
        return {
            success: true,
            data: {
                userId:   payload.userId   as string,
                username: payload.username as string,
                name:     payload.name     as string,
                role:     (payload.role     as string) || 'user',
                color:    (payload.color    as string) || '#6366f1',
            },
        }
    } catch {
        return { success: true, data: null }
    }
}
