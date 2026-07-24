import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { convertFromDefault } from '@/lib/currency-utils'
import { BotServiceError } from './errors'
import { ItemRefSchema, resolveItemRef } from './resolve-item'
import { optionalString } from '@/lib/zod-optional'

export const ItemPriceQuerySchema = ItemRefSchema.and(
    z.object({
        customerId: optionalString,
        currency: optionalString,
    })
)

export type ItemPriceQuery = z.infer<typeof ItemPriceQuerySchema>

const currencySelect = {
    id: true,
    code: true,
    symbol: true,
    name: true,
    isDefault: true,
    exchangeRate: true,
} as const

type CurrencyRow = {
    code: string
    symbol: string
    name: string
    isDefault: boolean
    exchangeRate: { toString(): string } | null
}

/** Shared pricing context for one request (search batch or single item). */
export type PriceDisplayContext = {
    customerId: string | null
    /** When set, keep only this price label; otherwise prefer isDefault labels. */
    priceLabelId: string | null
    targetCurrencies: CurrencyRow[]
}

export type ItemPriceDisplay = {
    label: string
    value: number
    currency: { code: string; symbol: string; name: string }
    unit: string | null
}

export type ItemPriceSourceRow = {
    value: { toString(): string } | number
    priceLabelId: string
    priceLabel: { name: string; isDefault: boolean }
    unit: { name: string } | null
}

/** Parse price query params; throws BotServiceError on validation failure. */
export function parseItemPriceQuery(searchParams: URLSearchParams) {
    const parsed = ItemPriceQuerySchema.safeParse({
        itemId: searchParams.get('itemId') ?? undefined,
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

/**
 * Resolve customer label + target currencies once per request.
 * Throws NOT_FOUND if customerId/currency are set but invalid.
 */
export async function resolvePriceDisplayContext(input: {
    customerId?: string
    currency?: string
}): Promise<PriceDisplayContext> {
    let customer: {
        id: string
        priceLabelId: string | null
        customerCurrencies: Array<{ currency: CurrencyRow }>
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

    const defaultCurrency = await prisma.currency.findFirst({
        where: { isDefault: true },
        select: currencySelect,
    })

    let targetCurrencies: CurrencyRow[] = []
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

    return {
        customerId: customer?.id ?? null,
        priceLabelId: customer?.priceLabelId ?? null,
        targetCurrencies,
    }
}

/** Filter + convert item prices using a resolved display context. */
export function mapItemPricesForDisplay(
    itemPrices: ItemPriceSourceRow[],
    ctx: PriceDisplayContext
): ItemPriceDisplay[] {
    let filtered = itemPrices
    if (ctx.priceLabelId) {
        filtered = filtered.filter(pp => pp.priceLabelId === ctx.priceLabelId)
    } else {
        const defaultOnly = filtered.filter(pp => pp.priceLabel.isDefault)
        if (defaultOnly.length > 0) filtered = defaultOnly
    }

    return filtered.flatMap(pp =>
        ctx.targetCurrencies.map(c => ({
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
}

export async function getItemPrice(input: ItemPriceQuery) {
    const item = await resolveItemRef(input)
    const ctx = await resolvePriceDisplayContext(input)

    const itemPrices = await prisma.itemPrice.findMany({
        where: { itemId: item.id },
        include: {
            priceLabel: true,
            unit: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
    })

    return {
        itemId: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
        customerId: ctx.customerId,
        prices: mapItemPricesForDisplay(itemPrices, ctx),
    }
}
