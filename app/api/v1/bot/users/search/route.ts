import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    validateApiKey,
    apiError,
    apiSuccess,
    normalizePhonePatterns,
    validatePhoneInput,
} from '@/lib/api-utils'

// GET /api/v1/bot/users/search?phone=xxx
// Aliases accepted: q, value
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)

        const raw = searchParams.get('phone')
            || searchParams.get('q')
            || searchParams.get('value')

        if (!raw || !raw.trim()) {
            return apiError('يجب تمرير رقم الهاتف عبر المعامل phone', 400, { code: 'MISSING_PHONE' })
        }

        const cleaned = validatePhoneInput(raw.trim())
        if (!cleaned) {
            return apiError(
                'رقم الهاتف غير صالح — يجب أن يحتوي على أرقام فقط ولا يقل عن 7 خانات',
                400,
                { code: 'INVALID_PHONE' }
            )
        }

        const patterns = normalizePhonePatterns(raw.trim())

        const user = await prisma.user.findFirst({
            where: {
                contacts: {
                    some: {
                        value: { in: patterns },
                        type: { in: ['phone', 'whatsapp'] },
                    },
                },
            },
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
        })

        if (!user) {
            return apiSuccess(null, 200, {
                found: false,
                meta: { phone: raw.trim(), patterns },
            })
        }

        return apiSuccess(user, 200, {
            found: true,
            meta: { phone: raw.trim(), patterns },
        })
    } catch (error: any) {
        console.error('API Error [GET /users/search]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
