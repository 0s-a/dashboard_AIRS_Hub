import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

// GET /api/v1/bot/persons/[id]/pricing — Get person's currencies & price labels
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
            select: {
                id: true,
                name: true,
                currencies: true, // JSON array of currency IDs
                personType: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        icon: true
                    }
                },
                priceLabels: {
                    include: {
                        priceLabel: {
                            select: {
                                id: true,
                                itemNumber: true,
                                name: true,
                                notes: true,
                            }
                        }
                    }
                },
            },
        })

        if (!person) {
            return NextResponse.json({ error: 'الشخص غير موجود' }, { status: 404 })
        }

        // Resolve currency IDs to full currency objects
        const currencyIds = (person.currencies as string[]) || []
        const currencies = currencyIds.length > 0
            ? await prisma.currency.findMany({
                where: { id: { in: currencyIds } },
                select: {
                    id: true,
                    itemNumber: true,
                    name: true,
                    code: true,
                    symbol: true,
                    isDefault: true,
                },
            })
            : []

        // Format price labels
        const priceLabels = person.priceLabels.map(pl => pl.priceLabel)

        return NextResponse.json({
            success: true,
            data: {
                personId: person.id,
                personName: person.name,
                personType: person.personType,
                currencies,
                priceLabels,
            }
        })
    } catch (error) {
        console.error('API Error [GET /persons/id/pricing]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
