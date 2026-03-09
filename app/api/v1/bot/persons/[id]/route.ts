import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateApiKey, PERSON_INCLUDE, resolveCurrenciesSingle } from '@/lib/api-utils'

// Zod Schemas for Validation
const contactSchema = z.object({
    type: z.string().min(1, 'نوع التواصل مطلوب'),
    value: z.string().min(1, 'قيمة التواصل مطلوبة'),
    label: z.string().nullable().optional(),
    isPrimary: z.boolean().default(false),
})

const updatePersonSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب').optional(),
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
    isActive: z.boolean().optional(),
})

// GET /api/v1/bot/persons/[id] — Get single person
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const person = await prisma.person.findUnique({
            where: { id },
            include: PERSON_INCLUDE,
        })

        if (!person) {
            return NextResponse.json({ error: 'الشخص غير موجود' }, { status: 404 })
        }

        const enriched = await resolveCurrenciesSingle(person)
        return NextResponse.json({ success: true, data: enriched })
    } catch (error) {
        console.error('API Error [GET /persons/id]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PUT /api/v1/bot/persons/[id] — Update person
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const rawBody = await req.json()
        
        // Zod Validation
        const validationResult = updatePersonSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return NextResponse.json({ 
                error: 'البيانات غير صالحة', 
                details: validationResult.error.format() 
            }, { status: 400 })
        }
        
        const body = validationResult.data

        // Check person exists
        const existing = await prisma.person.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'الشخص غير موجود' }, { status: 404 })
        }

        const person = await prisma.person.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.address !== undefined && { address: body.address }),
                ...(body.notes !== undefined && { notes: body.notes }),
                ...(body.source !== undefined && { source: body.source }),
                ...(body.personTypeId !== undefined && { personTypeId: body.personTypeId || null }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
                ...(body.contacts !== undefined && {
                    contacts: {
                        deleteMany: {},
                        create: body.contacts
                            .filter(c => c.value?.trim())
                            .map(c => ({
                                type: c.type,
                                value: c.value.trim(),
                                label: c.label || null,
                                isPrimary: c.isPrimary || false,
                            }))
                    }
                }),
                ...(body.tags !== undefined && { tags: body.tags ? body.tags : undefined }),
                ...(body.currencyIds !== undefined && { currencies: body.currencyIds ? body.currencyIds : undefined }),
                ...(body.groupName !== undefined && { groupName: body.groupName || null }),
                ...(body.groupNumber !== undefined && { groupNumber: body.groupNumber || null }),
                ...(body.priceLabelIds !== undefined && {
                    priceLabels: {
                        deleteMany: {},
                        create: (body.priceLabelIds || []).map((plId: string) => ({
                            priceLabel: { connect: { id: plId } }
                        }))
                    }
                }),
                lastInteraction: new Date(),
            },
            include: PERSON_INCLUDE,
        })

        const enriched = await resolveCurrenciesSingle(person)
        return NextResponse.json({ success: true, data: enriched })
    } catch (error: any) {
        console.error('API Error [PUT /persons/id]:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return NextResponse.json({ error: 'رقم الهاتف أو البريد مسجل بالفعل لشخص آخر' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE /api/v1/bot/persons/[id] — Delete person
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params

        const existing = await prisma.person.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'الشخص غير موجود' }, { status: 404 })
        }

        await prisma.person.delete({ where: { id } })
        return NextResponse.json({ success: true, message: 'تم حذف الشخص بنجاح' })
    } catch (error) {
        console.error('API Error [DELETE /persons/id]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
