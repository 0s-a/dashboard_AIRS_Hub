// ============================================================
// Shared Prisma Include/Select constants
// ============================================================

export const ORDER_ITEM_INCLUDE = {
    product: {
        select: {
            id: true,
            name: true,
            productNumber: true,
        },
    },
    sku: {
        select: {
            id: true,
            skuCode: true,
            sizeLabel: true,
            skc: { select: { id: true, color: { select: { id: true, code: true, name: true, hexCode: true } } } },
            productPrices: {
                where: { currency: { isDefault: true } },
                include: {
                    priceLabel: { select: { id: true, name: true, isDefault: true } },
                    currency: { select: { id: true, symbol: true, code: true } },
                },
            },
        },
    },
    unit:       { select: { id: true, name: true, pluralName: true } },
    currency:   { select: { id: true, symbol: true, code: true } },
    priceLabel: { select: { id: true, name: true } },
} as const

export const ORDER_INCLUDE = {
    customer: {
        select: {
            id: true,
            name: true,
            priceLabelId: true,
        },
    },
    items: { include: ORDER_ITEM_INCLUDE },
} as const

export const CUSTOMER_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    priceLabel: { select: { id: true, name: true, customerType: true } },
    tags: { include: { tag: { select: { id: true, name: true } } } },
    customerCurrencies: { include: { currency: { select: { id: true, name: true, code: true, symbol: true } } } },
} as const

export const PRODUCT_INCLUDE = {
    category: { select: { id: true, name: true, code: true, icon: true } },
    brandRef: { select: { id: true, name: true, code: true } },
    skcs: {
        orderBy: { order: 'asc' as const },
        include: {
            images: { orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }] },
            skus: {
                orderBy: { order: 'asc' as const },
                include: {
                    productPrices: {
                        include: { priceLabel: true, currency: true, unit: true },
                        orderBy: { createdAt: 'asc' as const },
                    },
                },
            },
        },
    },
    productUnits: {
        include: { unit: true },
        orderBy: { order: 'asc' as const },
    },
} as const
