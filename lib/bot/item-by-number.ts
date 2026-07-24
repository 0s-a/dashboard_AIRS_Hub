import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BotServiceError } from './errors'
import { findItemIdByItemNumber } from './resolve-item-number'
import { getItemPrice } from './item-price'
import { optionalString } from '@/lib/zod-optional'

export const ItemByNumberQuerySchema = z.object({
    itemNumber: z.string().trim().min(1, 'يجب تمرير itemNumber'),
    customerId: optionalString,
    currency: optionalString,
})

export type ItemByNumberQuery = z.infer<typeof ItemByNumberQuerySchema>

/** Full item card — display fields aligned with products/search (no unused UUIDs). */
export type ItemCardResult = {
    id: string
    itemNumber: string
    name: string
    description: string | null
    isAvailable: boolean
    product: { code: string; name: string }
    brand: string | null
    category: string
    attributes: Array<{ name: string; value: string }>
    units: Array<{
        unitId: string
        name: string
        isBase: boolean
        conversionFactor: number
        barcode: string | null
    }>
    prices: Array<{
        label: string
        value: number
        currency: { code: string; symbol: string; name: string }
        unit: string | null
    }>
    images: Array<{ url: string; alt: string | null; isPrimary: boolean }>
    primaryImage: { url: string; alt: string | null } | null
}

/** @deprecated alias — use ItemCardResult */
export type ItemByNumberResult = ItemCardResult

const itemCardSelect = {
    id: true,
    itemNumber: true,
    name: true,
    description: true,
    isAvailable: true,
    product: {
        select: {
            code: true,
            name: true,
            brand: { select: { name: true } },
            category: { select: { name: true } },
        },
    },
    itemAttributes: {
        select: {
            value: true,
            attribute: { select: { name: true } },
        },
        orderBy: { attribute: { name: 'asc' as const } },
    },
    itemUnits: {
        select: {
            unitId: true,
            isBase: true,
            conversionFactor: true,
            barcode: true,
            unit: { select: { name: true } },
        },
        orderBy: { order: 'asc' as const },
    },
    itemImages: {
        select: {
            url: true,
            alt: true,
            isPrimary: true,
        },
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
    },
} satisfies Prisma.ItemSelect

type ItemCardRow = Prisma.ItemGetPayload<{ select: typeof itemCardSelect }>

function notFoundItem(q: string): never {
    throw new BotServiceError('الصنف غير موجود', 404, 'NOT_FOUND', {
        suggestSearch: true,
        q,
    })
}

/** Parse by-number query params; throws BotServiceError on validation failure. */
export function parseItemByNumberQuery(searchParams: URLSearchParams) {
    const parsed = ItemByNumberQuerySchema.safeParse({
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

async function buildItemCard(
    itemId: string,
    opts: { customerId?: string; currency?: string; notFoundQ: string }
): Promise<ItemCardResult> {
    const item: ItemCardRow | null = await prisma.item.findUnique({
        where: { id: itemId },
        select: itemCardSelect,
    })

    if (!item) {
        notFoundItem(opts.notFoundQ)
    }

    const priceResult = await getItemPrice({
        itemId: item.id,
        customerId: opts.customerId,
        currency: opts.currency,
    })

    const images = item.itemImages.map(img => ({
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
    }))
    const primary = images[0]
    const primaryImage = primary
        ? { url: primary.url, alt: primary.alt }
        : null

    return {
        id: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
        description: item.description,
        isAvailable: item.isAvailable,
        product: {
            code: item.product.code,
            name: item.product.name,
        },
        brand: item.product.brand?.name ?? null,
        category: item.product.category.name,
        attributes: item.itemAttributes.map(pa => ({
            name: pa.attribute.name,
            value: pa.value,
        })),
        units: item.itemUnits.map(iu => ({
            unitId: iu.unitId,
            name: iu.unit.name,
            isBase: iu.isBase,
            conversionFactor: iu.conversionFactor,
            barcode: iu.barcode,
        })),
        prices: priceResult.prices,
        images,
        primaryImage,
    }
}

/**
 * Full Item card lookup by itemNumber (identity, product context, units, prices, images).
 */
export async function getItemByNumber(
    input: ItemByNumberQuery
): Promise<ItemCardResult> {
    const itemId = await findItemIdByItemNumber(input.itemNumber)
    if (!itemId) {
        notFoundItem(input.itemNumber)
    }

    return buildItemCard(itemId, {
        customerId: input.customerId,
        currency: input.currency,
        notFoundQ: input.itemNumber,
    })
}

export const ItemByIdQuerySchema = z.object({
    itemId: z.string().uuid('يجب تمرير itemId صالح'),
    customerId: optionalString,
    currency: optionalString,
})

export type ItemByIdQuery = z.infer<typeof ItemByIdQuerySchema>

export function parseItemByIdQuery(searchParams: URLSearchParams) {
    const parsed = ItemByIdQuerySchema.safeParse({
        itemId: searchParams.get('itemId') ?? undefined,
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

/** Full Item card by UUID — same shape as by-number. */
export async function getItemById(input: ItemByIdQuery): Promise<ItemCardResult> {
    return buildItemCard(input.itemId, {
        customerId: input.customerId,
        currency: input.currency,
        notFoundQ: input.itemId,
    })
}
