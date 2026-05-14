import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// GET /api/v1/bot/persons/[id]/pricing — Get person's currencies & price labels
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
            select: {
                id: true,
                name: true,
                personCurrencies: {
                    include: {
                        currency: {
                            select: { id: true, itemNumber: true, name: true, code: true, symbol: true, isDefault: true }
                        }
                    }
                },

                priceLabels: {
                    include: {
                        priceLabel: {
                            select: { id: true, itemNumber: true, name: true, notes: true }
                        }
                    }
                },
            },
        })

        if (!person) return apiError('الشخص غير موجود', 404, { code: 'NOT_FOUND' })

        const currencies = person.personCurrencies.map(pc => pc.currency)

        return apiSuccess({
            personId:    person.id,
            personName:  person.name,

            currencies,
            priceLabels: person.priceLabels.map((pl: any) => pl.priceLabel),
        })
    } catch (error) {
        console.error('API Error [GET /persons/id/pricing]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
