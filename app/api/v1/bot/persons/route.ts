import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
    validateApiKey, 
    PERSON_INCLUDE, 
    resolveCurrencies, 
    normalizePhonePatterns,
    parsePagination,
    paginationMeta 
} from '@/lib/api-utils'

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
    tags: z.any().optional(),
    currencyIds: z.array(z.string()).optional(),
    groupName: z.string().nullable().optional(),
    groupNumber: z.string().nullable().optional(),
    priceLabelIds: z.array(z.string()).optional(),
})

// GET /api/v1/bot/persons — List persons (with search, pagination & active filter)
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || searchParams.get('q')
        const active = searchParams.get('active')
        const { page, limit, skip } = parsePagination(searchParams)

        const where: any = {}
        
        if (search) {
            const patterns = normalizePhonePatterns(search)
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                {
                    contacts: {
                        some: {
                            OR: patterns.map(p => ({
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
            pagination: paginationMeta(totalCount, page, limit),
        })
    } catch (error) {
        console.error('API Error [GET /persons]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/v1/bot/persons — Create or Update (Upsert) a person
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

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

        // ── Resolve default person type ──
        let finalPersonTypeId = body.personTypeId || null
        if (!finalPersonTypeId) {
            const defaultType = await prisma.personType.findFirst({
                where: { isDefault: true }
            })
            if (defaultType) {
                finalPersonTypeId = defaultType.id
            }
        }

        // ── Check for existing person (duplicate detection) ──
        let existingPerson: any = null

        // 1. Search by contact value (phone/email/whatsapp)
        const contactValues = (body.contacts || [])
            .map(c => c.value?.trim())
            .filter(Boolean) as string[]

        if (contactValues.length > 0) {
            const allPatterns = new Set<string>()
            for (const val of contactValues) {
                normalizePhonePatterns(val).forEach(p => allPatterns.add(p))
            }

            existingPerson = await prisma.person.findFirst({
                where: {
                    contacts: {
                        some: {
                            value: { in: Array.from(allPatterns) }
                        }
                    }
                },
                include: PERSON_INCLUDE,
            })
        }

        // 2. If not found by contact, search by groupNumber
        if (!existingPerson && body.groupNumber?.trim()) {
            existingPerson = await prisma.person.findFirst({
                where: { groupNumber: body.groupNumber.trim() },
                include: PERSON_INCLUDE,
            })
        }

        // ── UPDATE existing person ──
        if (existingPerson) {
            const existingContactValues = new Set(
                (existingPerson.contacts || []).map((c: any) => c.value)
            )
            const newContacts = (body.contacts || [])
                .filter(c => c.value?.trim() && !existingContactValues.has(c.value.trim()))

            const updatedPerson = await prisma.person.update({
                where: { id: existingPerson.id },
                data: {
                    name: existingPerson.name ? existingPerson.name : (body.name?.trim() || existingPerson.name),
                    address: body.address || existingPerson.address,
                    notes: body.notes || existingPerson.notes,
                    personTypeId: existingPerson.personTypeId || finalPersonTypeId,
                    source: body.source || existingPerson.source,
                    groupName: body.groupName || existingPerson.groupName,
                    groupNumber: body.groupNumber || existingPerson.groupNumber,
                    lastInteraction: new Date(),
                    contacts: newContacts.length > 0 ? {
                        create: newContacts.map(c => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                    } : undefined,
                },
                include: PERSON_INCLUDE,
            })

            const [enriched] = await resolveCurrencies([updatedPerson])

            return NextResponse.json({ 
                success: true, 
                action: 'updated',
                data: enriched 
            }, { status: 200 })
        }

        // ── CREATE new person ──
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

        return NextResponse.json({ 
            success: true, 
            action: 'created',
            data: enriched 
        }, { status: 201 })
    } catch (error: any) {
        console.error('API Error [POST /persons]:', error)
        if (error?.code === 'P2002') {
            const target = error?.meta?.target
            if (target?.includes('value')) {
                return NextResponse.json({ 
                    error: 'رقم الهاتف أو البريد مسجل بالفعل لشخص آخر',
                    details: `Duplicate contact: ${target}`
                }, { status: 409 })
            }
            return NextResponse.json({ 
                error: 'بيانات مكررة',
                details: `Duplicate field: ${target}`
            }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
