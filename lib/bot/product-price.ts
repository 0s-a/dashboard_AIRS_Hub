import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { convertFromDefault } from '@/lib/currency-utils'
import { BotServiceError } from './errors'
import { ProductRefSchema, resolveProductRef } from './resolve-product'

export const ProductPriceQuerySchema = ProductRefSchema.and(
    z.object({
        customerId: z.string().min(1).optional(),
        currency: z.string().min(1).optional(),
    })
)

export type ProductPriceQuery = z.infer<typeof ProductPriceQuerySchema>

const currencySelect = {
    id: true,
    code: true,
    symbol: true,
    name: true,
    isDefault: true,
    exchangeRate: true,
} as const

/** Parse price query params; throws BotServiceError on validation failure. */
export function parseProductPriceQuery(searchParams: URLSearchParams) {
    const parsed = ProductPriceQuerySchema.safeParse({
        productId: searchParams.get('productId') ?? undefined,
        itemNumber: searchParams.get('itemNumber') ?? undefined,
        customerId: searchParams.get('customerId') ?? undefined,
        currency: searchParams.get('currency') ?? undefined,
    })
    if (!parsed.success) {
        throw new BotServiceError(
            'البيانات غير صالحة',
            400,
            'VALIDATION_ERROR',
            parsed.error.flatten()
        )
    }
    return parsed.data
}

export async function getProductPrice(input: ProductPriceQuery) {
    const product = await resolveProductRef(input)

    const productPrices = await prisma.productPrice.findMany({
        where: { productId: product.id },
        include: {
            priceLabel: true,
            unit: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
    })

    let customer: {
        id: string
        priceLabelId: string | null
        customerCurrencies: Array<{
            currency: {
                id: string
                code: string
                symbol: string
                name: string
                isDefault: boolean
                exchangeRate: { toString(): string } | null
            }
        }>
    } | null = null

    if (input.customerId?.trim()) {
        customer = await prisma.customer.findUnique({
            where: { id: input.customerId.trim() },
            select: {
                id: true,
                priceLabelId: true,
                customerCurrencies: {
                    include: { currency: { select: currencySelect } },
                },
            },
        })
        if (!customer) {
            throw new BotServiceError('العميل غير موجود', 404, 'NOT_FOUND')
        }
    }

    let filteredPrices = productPrices
    if (customer?.priceLabelId) {
        filteredPrices = filteredPrices.filter(
            pp => pp.priceLabelId === customer.priceLabelId
        )
    } else {
        const defaultOnly = filteredPrices.filter(pp => pp.priceLabel.isDefault)
        if (defaultOnly.length > 0) filteredPrices = defaultOnly
    }

    const defaultCurrency = await prisma.currency.findFirst({
        where: { isDefault: true },
        select: currencySelect,
    })

    let targetCurrencies: Array<{
        code: string
        symbol: string
        name: string
        isDefault: boolean
        exchangeRate: { toString(): string } | null
    }> = []

    const currencyCode = input.currency?.trim()
    if (currencyCode) {
        const currency = await prisma.currency.findFirst({
            where: { code: { equals: currencyCode, mode: 'insensitive' } },
            select: currencySelect,
        })
        if (!currency) {
            throw new BotServiceError('العملة غير موجودة', 404, 'NOT_FOUND')
        }
        targetCurrencies = [currency]
    } else if (customer) {
        const customerCurrencies = customer.customerCurrencies
            .map(cc => cc.currency)
            .filter(Boolean)
        targetCurrencies =
            customerCurrencies.length > 0
                ? customerCurrencies
                : defaultCurrency
                  ? [defaultCurrency]
                  : []
    } else if (defaultCurrency) {
        targetCurrencies = [defaultCurrency]
    }

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

    return {
        productId: product.id,
        itemNumber: product.itemNumber,
        productName: product.displayName,
        customerId: customer?.id ?? null,
        prices,
    }
}
