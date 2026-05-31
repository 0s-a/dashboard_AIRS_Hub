import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// GET /api/v1/bot/customers/[id]/pricing — Get customer's currencies & price labels
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
            select: {
                id: true,
                name: true,
                customerCurrencies: {
                    include: {
                        currency: {
                            select: { id: true, itemNumber: true, name: true, code: true, symbol: true, isDefault: true }
                        }
                    }
                },

                priceLabel: {
                    select: { id: true, itemNumber: true, name: true, customerType: true, notes: true }
                },
            },
        })

        if (!customer) return apiError('العميل غير موجود', 404, { code: 'NOT_FOUND' })

        const currencies = customer.customerCurrencies.map(pc => pc.currency)

        return apiSuccess({
            customerId:   customer.id,
            customerName: customer.name,
            currencies,
            priceLabel: customer.priceLabel,
        })
    } catch (error) {
        console.error('API Error [GET /customers/id/pricing]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
