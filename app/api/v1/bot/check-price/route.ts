
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

export async function POST(req: NextRequest) {
    // 1. Security Check
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { phoneNumber, productId } = body

        if (!phoneNumber || !productId) {
            return NextResponse.json({ error: 'Missing phoneNumber or productId' }, { status: 400 })
        }

        // 2. Get Product with prices (from ProductPrice table)
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                productPrices: {
                    include: {
                        priceLabel: true,
                        currency: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // 3. Find person by phone number and get their price labels
        const person = await prisma.person.findFirst({
            where: {
                contacts: { path: ['phones'], array_contains: phoneNumber },
            },
            include: {
                priceLabels: {
                    include: { priceLabel: true },
                },
            },
        })

        // 4. Filter prices based on person's assigned price labels
        let filteredPrices = product.productPrices

        if (person && person.priceLabels.length > 0) {
            const allowedLabelIds = new Set(person.priceLabels.map(pl => pl.priceLabelId))
            filteredPrices = product.productPrices.filter(pp => allowedLabelIds.has(pp.priceLabelId))
        }

        // 5. Format response
        const prices = filteredPrices.map(pp => ({
            label: pp.priceLabel.name,
            value: pp.value,
            currency: {
                code: pp.currency.code,
                symbol: pp.currency.symbol,
                name: pp.currency.name,
            },
            unit: pp.unit,
            quantity: pp.quantity,
        }))

        return NextResponse.json({
            success: true,
            data: {
                productId: product.id,
                productName: product.name,
                personName: person?.name || null,
                prices,
            }
        })

    } catch (error) {
        console.error('API Price Check Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}