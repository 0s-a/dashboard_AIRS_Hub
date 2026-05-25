import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// PATCH /api/v1/bot/persons/group/[groupNumber]/activate — Set active by groupNumber
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ groupNumber: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        // Decode the groupNumber just in case it has URL-encoded characters (like '@' -> '%40')
        const encodedGroupNumber = (await params).groupNumber
        const groupNumber = decodeURIComponent(encodedGroupNumber)

        const existing = await prisma.person.findUnique({
            where: { groupNumber },
            select: { id: true, isActive: true, name: true, groupNumber: true },
        })

        if (!existing) return apiError('لم يتم العثور على الشخص بهذا الرقم', 404, { code: 'NOT_FOUND' })

        if (existing.isActive) {
            return apiSuccess(existing, 200, {
                message: 'الشخص مفعل مسبقاً',
            })
        }

        const person = await prisma.person.update({
            where: { id: existing.id },
            data: { isActive: true },
            select: { id: true, name: true, isActive: true, groupNumber: true },
        })

        return apiSuccess(person, 200, {
            message: 'تم تفعيل الشخص بنجاح',
        })
    } catch (error) {
        console.error('API Error [PATCH /persons/group/[groupNumber]/activate]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
