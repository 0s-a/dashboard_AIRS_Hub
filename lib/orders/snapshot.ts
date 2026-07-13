import { prisma } from '@/lib/prisma'
import { resolveProductPrice } from '@/lib/action-utils'
import { convertFromDefault } from '@/lib/currency-utils'

export interface SnapshotInput {
    customerId?: string | null
    productId: string
    unitId?: string | null
    unitPrice?: number | null
    currencyId?: string | null
    priceLabelId?: string | null
}

export interface SnapshotResult {
    unitPrice: number | null
    currencyId: string | null
    priceLabelId: string | null
}

async function resolveTargetCurrency(input: SnapshotInput) {
    if (input.currencyId) {
        return prisma.currency.findUnique({ where: { id: input.currencyId } })
    }

    if (input.customerId) {
        const customerCurrency = await prisma.customerCurrency.findFirst({
            where: { customerId: input.customerId },
            include: { currency: true },
            orderBy: { assignedAt: 'asc' },
        })
        if (customerCurrency?.currency) return customerCurrency.currency
    }

    return prisma.currency.findFirst({ where: { isDefault: true } })
}

async function freezeConvertedPrice(
    valueInDefault: number,
    priceLabelId: string,
    input: SnapshotInput
): Promise<SnapshotResult> {
    const target = await resolveTargetCurrency(input)
    const unitPrice = convertFromDefault(valueInDefault, target)
    return {
        unitPrice,
        currencyId: target?.id ?? null,
        priceLabelId,
    }
}

async function tryLabelPrice(
    productId: string,
    priceLabelId: string,
    unitId: string | null | undefined,
    input: SnapshotInput
): Promise<SnapshotResult | null> {
    const price = await resolveProductPrice(productId, priceLabelId, unitId ?? undefined)
    if (!price) return null
    return freezeConvertedPrice(Number(price.value), price.priceLabelId, input)
}

export async function resolveItemSnapshot(input: SnapshotInput): Promise<SnapshotResult> {
    if (input.unitPrice != null) {
        return {
            unitPrice: input.unitPrice,
            currencyId: input.currencyId ?? null,
            priceLabelId: input.priceLabelId ?? null,
        }
    }

    const { productId } = input

    if (input.priceLabelId) {
        const fromExplicit = await tryLabelPrice(productId, input.priceLabelId, input.unitId, input)
        if (fromExplicit) return fromExplicit
    }

    if (input.customerId) {
        const customer = await prisma.customer.findUnique({
            where: { id: input.customerId },
            select: { priceLabelId: true },
        })
        if (customer?.priceLabelId) {
            const fromCustomer = await tryLabelPrice(
                productId,
                customer.priceLabelId,
                input.unitId,
                input
            )
            if (fromCustomer) return fromCustomer
        }
    }

    const defaultLabel = await prisma.priceLabel.findFirst({
        where: { isDefault: true },
        select: { id: true },
    })
    if (defaultLabel) {
        const fromDefault = await tryLabelPrice(productId, defaultLabel.id, input.unitId, input)
        if (fromDefault) return fromDefault
    }

    const anyPrice = await prisma.productPrice.findFirst({
        where: {
            productId,
            ...(input.unitId ? { unitId: input.unitId } : {}),
        },
    })

    if (anyPrice) {
        return freezeConvertedPrice(Number(anyPrice.value), anyPrice.priceLabelId, input)
    }

    return { unitPrice: null, currencyId: null, priceLabelId: null }
}
