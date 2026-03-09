import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, normalizePhonePatterns } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const body = await req.json()
        const { phoneNumber, productId } = body

        if (!phoneNumber || !productId) {
            return NextResponse.json({ error: 'Missing phoneNumber or productId' }, { status: 400 })
        }

        // Get Product with prices
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

        // Find person by phone number — using normalized patterns
        const patterns = normalizePhonePatterns(phoneNumber)
        const person = await prisma.person.findFirst({
            where: {
                contacts: {
                    some: {
                        OR: patterns.map(p => ({
                            value: { contains: p, mode: 'insensitive' }
                        }))
                    }
                }
            },
            include: {
                priceLabels: {
                    include: { priceLabel: true },
                },
            },
        })

        // Filter prices based on person's assigned price labels
        let filteredPrices = product.productPrices

        if (person && person.priceLabels.length > 0) {
            const allowedLabelIds = new Set(person.priceLabels.map(pl => pl.priceLabelId))
            filteredPrices = product.productPrices.filter(pp => allowedLabelIds.has(pp.priceLabelId))
        }

        // Format response
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