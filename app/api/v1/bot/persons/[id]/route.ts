import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updatePersonSchema } from '@/lib/validations/person'
import { validateApiKey, apiError, apiSuccess, PERSON_INCLUDE } from '@/lib/api-utils'

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

        if (!person) return apiError('الشخص غير موجود', 404, { code: 'NOT_FOUND' })
        return apiSuccess(person)
    } catch (error) {
        console.error('API Error [GET /persons/id]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
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

        const validationResult = updatePersonSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return apiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: validationResult.error.format(),
            })
        }

        const body = validationResult.data

        const existing = await prisma.person.findUnique({ where: { id } })
        if (!existing) return apiError('الشخص غير موجود', 404, { code: 'NOT_FOUND' })

        const person = await prisma.person.update({
            where: { id },
            data: {
                ...(body.name         !== undefined && { name: body.name }),
                ...(body.source       !== undefined && { source: body.source || null }),
                // NOTE: isActive is intentionally excluded — use PATCH /activate or /deactivate
                ...(body.contacts     !== undefined && {
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
                ...(body.tags !== undefined && {
                    tags: {
                        deleteMany: {},
                        create: (body.tags || []).map((name: string) => ({
                            tag: { connectOrCreate: { where: { name }, create: { name } } }
                        }))
                    }
                }),
                ...(body.currencyIds !== undefined && {
                    personCurrencies: {
                        deleteMany: {},
                        create: (body.currencyIds || []).map((currencyId: string) => ({ currencyId }))
                    }
                }),
                ...(body.groupName     !== undefined && { groupName: body.groupName || null }),
                ...(body.groupNumber   !== undefined && { groupNumber: body.groupNumber || null }),
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

        return apiSuccess(person)
    } catch (error: any) {
        console.error('API Error [PUT /persons/id]:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return apiError('رقم الهاتف أو البريد مسجل بالفعل لشخص آخر', 409, { code: 'DUPLICATE_CONTACT' })
        }
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}

// DELETE /api/v1/bot/persons/[id] — Hard delete person (guards against linked orders)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params

        const existing = await prisma.person.findUnique({ where: { id } })
        if (!existing) return apiError('الشخص غير موجود', 404, { code: 'NOT_FOUND' })

        // Guard: prevent deletion if the person has linked orders
        const ordersCount = await prisma.order.count({ where: { personId: id } })
        if (ordersCount > 0) {
            return apiError(
                `لا يمكن حذف الشخص — لديه ${ordersCount} طلب مرتبط`,
                409,
                { code: 'HAS_ORDERS', details: { ordersCount } }
            )
        }

        await prisma.person.delete({ where: { id } })
        return apiSuccess(null, 200, { message: 'تم حذف الشخص بنجاح' })
    } catch (error) {
        console.error('API Error [DELETE /persons/id]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
