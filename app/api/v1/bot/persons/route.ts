import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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

// Zod Schemas for Validation
const contactSchema = z.object({
    type: z.string().min(1, 'نوع التواصل مطلوب'),
    value: z.string().min(1, 'قيمة التواصل مطلوبة'),
    label: z.string().nullable().optional(),
    isPrimary: z.boolean().default(false),
})

const createPersonSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    address: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    personTypeId: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    contacts: z.array(contactSchema).optional(),
    tags: z.any().optional(), // Using any due to Prisma Json array structure nuances
    currencyIds: z.array(z.string()).optional(),
    groupName: z.string().nullable().optional(),
    groupNumber: z.string().nullable().optional(),
    priceLabelIds: z.array(z.string()).optional(),
})

// GET /api/v1/bot/persons — List persons (with search, pagination & active filter)
export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || searchParams.get('q')
        const active = searchParams.get('active')
        
        // Pagination
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')))
        const skip = (page - 1) * limit

        const where: any = {}
        
        if (search) {
            // Smart search parsing (similar to search route)
            const patterns = new Set<string>([search])
            const digits = search.replace(/\D/g, '')
            if (digits.length >= 7) {
                patterns.add(digits)
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

            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                {
                    contacts: {
                        some: {
                            OR: Array.from(patterns).map(p => ({
                                value: { contains: p, mode: 'insensitive' }
                            }))
                        }
                    }
                },
            ]
        }
        
        if (active === 'true') where.isActive = true
        if (active === 'false') where.isActive = false

        const [totalCount, persons] = await Promise.all([
            prisma.person.count({ where }),
            prisma.person.findMany({
                where,
                include: PERSON_INCLUDE,
                orderBy: { lastInteraction: 'desc' },
                skip,
                take: limit,
            })
        ])

        const enriched = await resolveCurrencies(persons)

        return NextResponse.json({ 
            success: true, 
            data: enriched, 
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        })
    } catch (error) {
        console.error('API Error [GET /persons]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/v1/bot/persons
export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const rawBody = await req.json()
        
        // Zod Validation
        const validationResult = createPersonSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return NextResponse.json({ 
                error: 'البيانات غير صالحة', 
                details: validationResult.error.format() 
            }, { status: 400 })
        }
        
        const body = validationResult.data

        let finalPersonTypeId = body.personTypeId || null

        if (!finalPersonTypeId) {
            const defaultType = await prisma.personType.findFirst({
                where: { isDefault: true }
            })
            if (defaultType) {
                finalPersonTypeId = defaultType.id
            }
        }

        const person = await prisma.person.create({
            data: {
                name: body.name.trim(),
                address: body.address || null,
                notes: body.notes || null,
                personTypeId: finalPersonTypeId,
                source: body.source || null,
                contacts: body.contacts && body.contacts.length > 0 ? {
                    create: body.contacts
                        .filter(c => c.value?.trim())
                        .map(c => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                } : undefined,
                tags: body.tags ? body.tags : undefined,
                currencies: body.currencyIds && body.currencyIds.length > 0 ? body.currencyIds : undefined,
                groupName: body.groupName || null,
                groupNumber: body.groupNumber || null,
                lastInteraction: new Date(),
                priceLabels: body.priceLabelIds && body.priceLabelIds.length > 0 ? {
                    create: body.priceLabelIds.map((id: string) => ({
                        priceLabel: { connect: { id } }
                    }))
                } : undefined,
            },
            include: PERSON_INCLUDE,
        })

        const [enriched] = await resolveCurrencies([person])

        return NextResponse.json({ success: true, data: enriched }, { status: 201 })
    } catch (error: any) {
        console.error('API Error [POST /persons]:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return NextResponse.json({ error: 'رقم الهاتف أو البريد مسجل بالفعل لشخص آخر' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

