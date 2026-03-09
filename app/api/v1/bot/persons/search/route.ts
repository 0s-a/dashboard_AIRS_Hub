import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, PERSON_INCLUDE, resolveCurrencies, normalizePhonePatterns } from '@/lib/api-utils'

// GET /api/v1/bot/persons/search?q=xxx or ?value=xxx or ?phone=xxx
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q') || searchParams.get('value') || searchParams.get('phone') || searchParams.get('email')

        if (!q) {
            return NextResponse.json({ error: 'يجب تمرير q أو value كمعلمة بحث' }, { status: 400 })
        }

        // Build search patterns using shared normalizer
        const patterns = normalizePhonePatterns(q)

        // Universal Search across all contact types
        const persons = await prisma.person.findMany({
            where: {
                contacts: {
                    some: {
                        OR: patterns.map(p => ({
                            value: { contains: p, mode: 'insensitive' }
                        }))
                    }
                }
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
            count: enriched.length 
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/search]:', error?.message || error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
