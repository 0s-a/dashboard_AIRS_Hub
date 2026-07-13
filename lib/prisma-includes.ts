// ============================================================
// Shared Prisma Include/Select constants
// ============================================================

export const ORDER_ITEM_INCLUDE = {
    product: {
        select: {
            id: true,
            name: true,
            itemNumber: true,
            productAttributes: {
                include: {
                    attribute: { select: { id: true, code: true, name: true } },
                },
                orderBy: { attribute: { name: 'asc' as const } },
            },
            productImages: {
                orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
                select: { url: true, alt: true, isPrimary: true },
            },
            productPrices: {
                include: {
                    priceLabel: { select: { id: true, name: true, isDefault: true } },
                },
            },
        },
    },
    unit: { select: { id: true, name: true, pluralName: true } },
    currency: { select: { id: true, symbol: true, code: true } },
    priceLabel: { select: { id: true, name: true } },
}

export const ORDER_INCLUDE = {
    customer: {
        select: {
            id: true,
            name: true,
            priceLabelId: true,
        },
    },
    items: { include: ORDER_ITEM_INCLUDE },
}

export const CUSTOMER_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    priceLabel: { select: { id: true, name: true, customerType: true } },
    tags: { include: { tag: { select: { id: true, name: true } } } },
    customerCurrencies: { include: { currency: { select: { id: true, name: true, code: true, symbol: true } } } },
} as const

export const PRODUCT_INCLUDE = {
    category: { select: { id: true, name: true, code: true } },
    brandRef: { select: { id: true, name: true, code: true } },
    productAttributes: {
        include: {
            attribute: { select: { id: true, code: true, name: true, examples: true } },
        },
        orderBy: { attribute: { name: 'asc' as const } },
    },
    productImages: {
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
    },
    productPrices: {
        include: { priceLabel: true, unit: true },
        orderBy: { createdAt: 'asc' as const },
    },
    productUnits: {
        include: { unit: true },
        orderBy: { order: 'asc' as const },
    },
} as const
