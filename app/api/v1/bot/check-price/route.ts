import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateApiKey, apiError, apiSuccess, normalizePhonePatterns } from '@/lib/api-utils'
import { convertFromDefault } from '@/lib/currency-utils'

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

        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                name: true,
                productPrices: {
                    include: {
                        priceLabel: true,
                        unit: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        })
        if (!product) return apiError('Product not found', 404, { code: 'NOT_FOUND' })

        const patterns = normalizePhonePatterns(phoneNumber)
        const customer = await prisma.customer.findFirst({
            where: { contacts: { some: { value: { in: patterns } } } },
            select: {
                id: true,
                name: true,
                priceLabelId: true,
                customerCurrencies: {
                    include: {
                        currency: {
                            select: {
                                id: true,
                                code: true,
                                symbol: true,
                                name: true,
                                isDefault: true,
                                exchangeRate: true,
                            },
                        },
                    },
                },
            },
        })

        let filteredPrices = product.productPrices
        if (customer?.priceLabelId) {
            filteredPrices = filteredPrices.filter(pp => pp.priceLabelId === customer.priceLabelId)
        } else {
            const defaultOnly = filteredPrices.filter(pp => pp.priceLabel.isDefault)
            if (defaultOnly.length > 0) filteredPrices = defaultOnly
        }

        const defaultCurrency = await prisma.currency.findFirst({
            where: { isDefault: true },
            select: {
                id: true,
                code: true,
                symbol: true,
                name: true,
                isDefault: true,
                exchangeRate: true,
            },
        })

        const customerCurrencies = (customer?.customerCurrencies || [])
            .map(cc => cc.currency)
            .filter(Boolean)

        const targetCurrencies =
            customerCurrencies.length > 0
                ? customerCurrencies
                : defaultCurrency
                    ? [defaultCurrency]
                    : []

        const prices = filteredPrices.flatMap(pp =>
            targetCurrencies.map(c => ({
                label: pp.priceLabel.name,
                value: convertFromDefault(Number(pp.value), c),
                currency: {
                    code: c.code,
                    symbol: c.symbol,
                    name: c.name,
                },
                unit: pp.unit?.name ?? null,
            }))
        )

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
