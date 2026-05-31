// ============================================================
// Shared Prisma Include/Select constants
// Eliminates duplication of query shapes across the codebase
// ============================================================

// ─── Order ──────────────────────────────────────────────────

export const ORDER_ITEM_INCLUDE = {
    product: { select: { id: true, name: true, itemNumber: true } },
    priceLabel: { select: { id: true, name: true } },
    currency: { select: { id: true, name: true, symbol: true, code: true } },
    variant: { select: { id: true, name: true, hex: true, type: true } },
} as const

export const ORDER_INCLUDE = {
    customer: { select: { id: true, name: true } },
    items: { include: ORDER_ITEM_INCLUDE },
} as const

// ─── Customer (formerly Customer) ─────────────────────────────

export const CUSTOMER_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    priceLabel: { select: { id: true, name: true, customerType: true } },
    tags: { include: { tag: { select: { id: true, name: true } } } },
    customerCurrencies: { include: { currency: { select: { id: true, name: true, code: true, symbol: true } } } },
} as const

/** @deprecated use CUSTOMER_INCLUDE */
export const PERSON_INCLUDE = CUSTOMER_INCLUDE

// ─── Product ────────────────────────────────────────────────

export const PRODUCT_INCLUDE = {
    category: { select: { id: true, name: true, icon: true } },
    productImages: {
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
    },
    variants: {
        orderBy: { order: 'asc' as const },
        include: { variantImages: true },
    },
    productPrices: {
        include: {
            priceLabel: true,
            currency: true,
        },
        orderBy: { createdAt: 'asc' as const },
    },
} as const
