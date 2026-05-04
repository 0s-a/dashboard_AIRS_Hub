import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// PATCH /api/v1/bot/persons/group/[groupNumber]/toggle — Toggle active/inactive by groupNumber
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

        const person = await prisma.person.update({
            where: { id: existing.id },
            data: { isActive: !existing.isActive },
            select: { id: true, name: true, isActive: true, groupNumber: true },
        })

        return apiSuccess(person, 200, {
            message: person.isActive ? 'تم تفعيل الشخص' : 'تم إلغاء تفعيل الشخص',
        })
    } catch (error) {
        console.error('API Error [PATCH /persons/group/[groupNumber]/toggle]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
