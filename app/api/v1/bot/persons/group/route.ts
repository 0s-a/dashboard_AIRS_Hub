import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, PERSON_INCLUDE, resolveCurrencies } from '@/lib/api-utils'

// GET /api/v1/bot/persons/group?groupNumber=xxx
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const groupNumber = searchParams.get('groupNumber') || searchParams.get('group') || searchParams.get('g')

        if (!groupNumber) {
            return NextResponse.json(
                { error: 'يجب تمرير groupNumber كمعلمة بحث' },
                { status: 400 }
            )
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

        return NextResponse.json({
            success: true,
            personId: firstPerson?.id || null,
            data: enriched,
            count: enriched.length,
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/group]:', error?.message || error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
