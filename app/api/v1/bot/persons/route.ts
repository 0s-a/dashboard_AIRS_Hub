import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

const PERSON_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    personType: { select: { id: true, name: true, color: true, icon: true } },
    priceLabels: { include: { priceLabel: { select: { id: true, name: true } } } },
    groups: { select: { id: true, name: true, number: true } },
}

// GET /api/v1/bot/persons — List persons (optional ?search= &active=)
export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search')
        const active = searchParams.get('active')

        const where: any = {}
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { contacts: { some: { value: { contains: search, mode: 'insensitive' } } } },
            ]
        }
        if (active === 'true') where.isActive = true
        if (active === 'false') where.isActive = false

        const persons = await prisma.person.findMany({
            where,
            include: PERSON_INCLUDE,
            orderBy: { lastInteraction: 'desc' },
        })

        return NextResponse.json({ success: true, data: persons, count: persons.length })
    } catch (error) {
        console.error('API Error [GET /persons]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    // 1. Security Check
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 2. Parse body
        const body = await req.json()

        // 3. Validate required fields
        if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
            return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
        }

        // 4. Create person with relational contacts
        const person = await prisma.person.create({
            data: {
                name: body.name.trim(),
                address: body.address || null,
                notes: body.notes || null,
                type: body.type || 'عادي',
                personTypeId: body.personTypeId || null,
                source: body.source || null,
                contacts: body.contacts && Array.isArray(body.contacts) && body.contacts.length > 0 ? {
                    create: body.contacts
                        .filter((c: any) => c.value?.trim())
                        .map((c: any) => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                } : undefined,
                tags: body.tags || null,
                currencies: body.currencyIds || null,
                lastInteraction: new Date(),
                priceLabels: body.priceLabelIds && body.priceLabelIds.length > 0 ? {
                    create: body.priceLabelIds.map((id: string) => ({
                        priceLabel: { connect: { id } }
                    }))
                } : undefined,
            },
            include: {
                personType: true,
                contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
                priceLabels: {
                    include: { priceLabel: true }
                },
            },
        })

        return NextResponse.json({ success: true, data: person }, { status: 201 })
    } catch (error: any) {
        console.error('API Error [POST /persons]:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return NextResponse.json({ error: 'رقم الهاتف أو البريد مسجل بالفعل لشخص آخر' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

