import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess, PERSON_INCLUDE, resolveCurrencies } from '@/lib/api-utils'

// GET /api/v1/bot/persons/group?groupNumber=xxx
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const groupNumber = searchParams.get('groupNumber') || searchParams.get('group') || searchParams.get('g')

        if (!groupNumber) {
            return apiError('يجب تمرير groupNumber كمعلمة بحث', 400, { code: 'MISSING_PARAM' })
        }

        const persons = await prisma.person.findMany({
            where: {
                groupNumber: {
                    contains: groupNumber,
                    mode: 'insensitive',
                },
            },
            include: PERSON_INCLUDE,
        })

        let enriched = persons as any[]
        try {
            enriched = await resolveCurrencies(persons)
        } catch (currError) {
            console.error('Currency resolution failed (non-fatal):', currError)
        }

        const firstPerson = enriched[0]

        return apiSuccess(enriched, 200, {
            personId: firstPerson?.id || null,
            count: enriched.length,
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/group]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
