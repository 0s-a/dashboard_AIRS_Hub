import { prisma } from '@/lib/prisma'
import { resolveSkuPrice } from '@/lib/action-utils'

export interface SnapshotInput {
    customerId?: string | null
    productId: string
    skuId?: string | null
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

async function resolveDefaultSkuId(productId: string, skuId?: string | null): Promise<string | null> {
    if (skuId) return skuId
    const sku = await prisma.sKU.findFirst({
        where: { skc: { productId } },
        orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
        select: { id: true },
    })
    return sku?.id ?? null
}

export async function resolveItemSnapshot(input: SnapshotInput): Promise<SnapshotResult> {
    if (input.unitPrice != null) {
        return {
            unitPrice: input.unitPrice,
            currencyId: input.currencyId ?? null,
            priceLabelId: input.priceLabelId ?? null,
        }
    }

    const skuId = await resolveDefaultSkuId(input.productId, input.skuId)
    if (!skuId) {
        return { unitPrice: null, currencyId: null, priceLabelId: null }
    }

    if (input.customerId) {
        const customer = await prisma.customer.findUnique({
            where: { id: input.customerId },
            select: { priceLabelId: true },
        })
        if (customer?.priceLabelId) {
            const price = await resolveSkuPrice(
                skuId,
                customer.priceLabelId,
                input.unitId ?? undefined
            )
            if (price) {
                return {
                    unitPrice: Number(price.value),
                    currencyId: price.currencyId,
                    priceLabelId: price.priceLabelId,
                }
            }
        }
    }

    const defaultLabel = await prisma.priceLabel.findFirst({
        where: { isDefault: true },
        select: { id: true },
    })
    if (defaultLabel) {
        const price = await resolveSkuPrice(
            skuId,
            defaultLabel.id,
            input.unitId ?? undefined
        )
        if (price) {
            return {
                unitPrice: Number(price.value),
                currencyId: price.currencyId,
                priceLabelId: price.priceLabelId,
            }
        }
    }

    const baseWhere = {
        skuId,
        ...(input.unitId ? { unitId: input.unitId } : {}),
    }

    const anyPrice =
        (await prisma.productPrice.findFirst({
            where: { ...baseWhere, currency: { isDefault: true } },
        })) ??
        (await prisma.productPrice.findFirst({ where: baseWhere }))

    if (anyPrice) {
        return {
            unitPrice: Number(anyPrice.value),
            currencyId: anyPrice.currencyId,
            priceLabelId: anyPrice.priceLabelId,
        }
    }

    return { unitPrice: null, currencyId: null, priceLabelId: null }
}
