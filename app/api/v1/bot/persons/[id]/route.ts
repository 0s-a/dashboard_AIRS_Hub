import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

const PERSON_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    personType: { select: { id: true, name: true, color: true, icon: true } },
    priceLabels: { include: { priceLabel: { select: { id: true, name: true } } } },
    groups: { select: { id: true, name: true, number: true } },
}

// GET /api/v1/bot/persons/[id] — Get single person
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const person = await prisma.person.findUnique({
            where: { id },
            include: PERSON_INCLUDE,
        })

        if (!person) {
            return NextResponse.json({ error: 'الشخص غير موجود' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: person })
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
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await req.json()

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
                ...(body.type !== undefined && { type: body.type }),
                ...(body.source !== undefined && { source: body.source }),
                ...(body.personTypeId !== undefined && { personTypeId: body.personTypeId || null }),
                ...(body.contacts !== undefined && {
                    contacts: {
                        deleteMany: {},
                        create: (body.contacts || [])
                            .filter((c: any) => c.value?.trim())
                            .map((c: any) => ({
                                type: c.type,
                                value: c.value.trim(),
                                label: c.label || null,
                                isPrimary: c.isPrimary || false,
                            }))
                    }
                }),
                ...(body.tags !== undefined && { tags: body.tags }),
                ...(body.currencyIds !== undefined && { currencies: body.currencyIds }),
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

        return NextResponse.json({ success: true, data: person })
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
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
