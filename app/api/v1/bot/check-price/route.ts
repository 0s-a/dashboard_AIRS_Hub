import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateApiKey, apiError, apiSuccess, normalizePhonePatterns } from '@/lib/api-utils'

const CheckPriceSchema = z.object({
    phoneNumber: z.string().min(1, 'phoneNumber is required'),
    productId: z.string().min(1, 'productId is required'),
})

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const rawBody = await req.json()
        const parsed = CheckPriceSchema.safeParse(rawBody)
        if (!parsed.success) {
            return apiError('Missing or invalid fields', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const { phoneNumber, productId } = parsed.data

        // Get Product with prices
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                productPrices: {
                    include: {
                        priceLabel: true,
                        currency: true,
                        unit: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        })

        if (!product) return apiError('Product not found', 404, { code: 'NOT_FOUND' })

        // Find customer by phone number — using normalized patterns
        const patterns = normalizePhonePatterns(phoneNumber)
        const customer = await prisma.customer.findFirst({
            where: {
                contacts: {
                    some: {
                        value: { in: patterns },
                    },
                },
            },
            select: { id: true, name: true, priceLabelId: true },
        })

        // Filter prices based on customer's assigned price labels
        let filteredPrices = product.productPrices

        if (customer?.priceLabelId) {
            filteredPrices = product.productPrices.filter(pp => pp.priceLabelId === customer.priceLabelId)
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
            unit: (pp as any).unit?.name ?? null,
        }))

        return apiSuccess({
            productId: product.id,
            productName: product.name,
            customerName: customer?.name || null,
            prices,
        })

    } catch (error) {
        console.error('API Price Check Error:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}