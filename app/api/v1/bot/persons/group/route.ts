import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    validateApiKey,
    apiError,
    apiSuccess,
    PERSON_INCLUDE,
    parsePagination,
    paginationMeta,
} from '@/lib/api-utils'

// GET /api/v1/bot/persons/group?groupNumber=xxx[&page=1&limit=50]
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const groupNumber = searchParams.get('groupNumber')
            || searchParams.get('group')
            || searchParams.get('g')

        if (!groupNumber) {
            return apiError('يجب تمرير groupNumber كمعلمة بحث', 400, { code: 'MISSING_PARAM' })
        }

        const { page, limit, skip } = parsePagination(searchParams)

        const where = {
            groupNumber: {
                contains: groupNumber,
                mode: 'insensitive' as const,
            },
        }

        const [persons, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: PERSON_INCLUDE,
                take: limit,
                skip,
            }),
            prisma.person.count({ where }),
        ])

        return apiSuccess(persons, 200, {
            personId: persons[0]?.id ?? null,
            count: total,
            pagination: paginationMeta(total, page, limit),
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/group]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
