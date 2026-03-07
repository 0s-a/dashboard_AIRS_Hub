import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

const PERSON_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    personType: { select: { id: true, name: true, color: true, icon: true } },
    priceLabels: { include: { priceLabel: { select: { id: true, name: true } } } },
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

        const firstPerson = persons[0]
        console.log(`Search for "${q}" found ${persons.length} results`);

        return NextResponse.json({ 
            success: true, 
            personId: firstPerson?.id || null, 
            data: persons, 
            count: persons.length 
        })
    } catch (error) {
        console.error('API Error [GET /persons/search]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
