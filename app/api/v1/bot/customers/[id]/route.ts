import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCustomerSchema } from '@/lib/validations/customer'
import { validateApiKey, apiError, apiSuccess, CUSTOMER_INCLUDE } from '@/lib/api-utils'

// GET /api/v1/bot/customers/[id] — Get single customer
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: CUSTOMER_INCLUDE,
        })

        if (!customer) return apiError('العميل غير موجود', 404, { code: 'NOT_FOUND' })
        return apiSuccess(customer)
    } catch (error) {
        console.error('API Error [GET /customers/id]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}

// PUT /api/v1/bot/customers/[id] — Update customer
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const rawBody = await req.json()

        const validationResult = updateCustomerSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return apiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: validationResult.error.format(),
            })
        }

        const body = validationResult.data

        const existing = await prisma.customer.findUnique({ where: { id } })
        if (!existing) return apiError('العميل غير موجود', 404, { code: 'NOT_FOUND' })

        const customer = await prisma.customer.update({
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
                    customerCurrencies: {
                        deleteMany: {},
                        create: (body.currencyIds || []).map((currencyId: string) => ({ currencyId }))
                    }
                }),
                ...(body.priceLabelId !== undefined && {
                    priceLabelId: body.priceLabelId || null,
                }),
                lastInteraction: new Date(),
            },
            include: CUSTOMER_INCLUDE,
        })

        return apiSuccess(customer)
    } catch (error: any) {
        console.error('API Error [PUT /customers/id]:', error)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('value')) {
            return apiError('رقم الهاتف أو البريد مسجل بالفعل لعميل آخر', 409, { code: 'DUPLICATE_CONTACT' })
        }
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}

// DELETE /api/v1/bot/customers/[id] — Hard delete customer (guards against linked orders)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params

        const existing = await prisma.customer.findUnique({ where: { id } })
        if (!existing) return apiError('العميل غير موجود', 404, { code: 'NOT_FOUND' })

        // Guard: prevent deletion if the customer has linked orders
        const ordersCount = await prisma.order.count({ where: { customerId: id } })
        if (ordersCount > 0) {
            return apiError(
                `لا يمكن حذف العميل — لديه ${ordersCount} طلب مرتبط`,
                409,
                { code: 'HAS_ORDERS', details: { ordersCount } }
            )
        }

        await prisma.customer.delete({ where: { id } })
        return apiSuccess(null, 200, { message: 'تم حذف العميل بنجاح' })
    } catch (error) {
        console.error('API Error [DELETE /customers/id]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
