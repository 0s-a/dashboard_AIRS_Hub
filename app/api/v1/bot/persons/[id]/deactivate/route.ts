import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// PATCH /api/v1/bot/persons/[id]/deactivate — Set inactive
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

        if (!existing.isActive) {
            return apiSuccess(existing, 200, {
                message: 'الشخص غير مفعل مسبقاً',
            })
        }

        const person = await prisma.person.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, name: true, isActive: true },
        })

        return apiSuccess(person, 200, {
            message: 'تم إلغاء تفعيل الشخص بنجاح',
        })
    } catch (error) {
        console.error('API Error [PATCH /persons/id/deactivate]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
