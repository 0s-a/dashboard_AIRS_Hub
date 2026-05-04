import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// PATCH /api/v1/bot/persons/[id]/toggle — Toggle active/inactive
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params

        const existing = await prisma.person.findUnique({
            where: { id },
            select: { id: true, isActive: true, name: true },
        })

        if (!existing) return apiError('الشخص غير موجود', 404, { code: 'NOT_FOUND' })

        const person = await prisma.person.update({
            where: { id },
            data: { isActive: !existing.isActive },
            select: { id: true, name: true, isActive: true },
        })

        return apiSuccess(person, 200, {
            message: person.isActive ? 'تم تفعيل الشخص' : 'تم إلغاء تفعيل الشخص',
        })
    } catch (error) {
        console.error('API Error [PATCH /persons/id/toggle]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
