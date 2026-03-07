import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

const PERSON_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    personType: { select: { id: true, name: true, color: true, icon: true } },
    priceLabels: { include: { priceLabel: { select: { id: true, name: true } } } },
}

// Resolve currency UUIDs (JSON) to full Currency objects
async function resolveCurrencies(persons: any[]) {
    const allIds = new Set<string>()
    for (const p of persons) {
        if (Array.isArray(p.currencies)) {
            p.currencies.forEach((id: string) => allIds.add(id))
        }
    }
    if (allIds.size === 0) return persons
    const currencies = await prisma.currency.findMany({
        where: { id: { in: Array.from(allIds) } },
        select: { id: true, name: true, code: true, symbol: true },
    })
    const map = new Map(currencies.map(c => [c.id, c]))
    return persons.map(p => ({
        ...p,
        currencies: Array.isArray(p.currencies)
            ? p.currencies.map((id: string) => map.get(id) || { id }).filter(Boolean)
            : [],
    }))
}

// GET /api/v1/bot/persons/search?q=xxx or ?value=xxx or ?phone=xxx
export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q') || searchParams.get('value') || searchParams.get('phone') || searchParams.get('email')

        if (!q) {
            return NextResponse.json({ error: 'يجب تمرير q أو value كمعلمة بحث' }, { status: 400 })
        }

        // 1. Build Search Patterns
        const patterns = new Set<string>([q])
        
        // Clean digits for smart phone matching
        const digits = q.replace(/\D/g, '')
        if (digits.length >= 7) { // Only if it looks like a part of a phone number
            patterns.add(digits)
            
            // Saudi format variations
            if (digits.startsWith('05') && digits.length === 10) {
                patterns.add(digits.substring(1))
                patterns.add('966' + digits.substring(1))
            } else if (digits.startsWith('9665') && digits.length === 12) {
                patterns.add(digits.substring(3))
                patterns.add('0' + digits.substring(3))
            } else if (digits.startsWith('5') && digits.length === 9) {
                patterns.add('0' + digits)
                patterns.add('966' + digits)
            }
        }

        // 2. Universal Search across all contact types
        const persons = await prisma.person.findMany({
            where: {
                contacts: {
                    some: {
                        OR: Array.from(patterns).map(p => ({
                            value: { contains: p, mode: 'insensitive' }
                        }))
                    }
                }
            },
            include: PERSON_INCLUDE,
        })

        let enriched = persons
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
        console.error('Stack:', error?.stack)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
