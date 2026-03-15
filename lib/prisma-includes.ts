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
    person: { select: { id: true, name: true } },
    items: { include: ORDER_ITEM_INCLUDE },
} as const

// ─── Person ─────────────────────────────────────────────────

export const PERSON_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    personType: { select: { id: true, name: true, color: true, icon: true } },
    priceLabels: { include: { priceLabel: { select: { id: true, name: true } } } },
} as const

// ─── Product ────────────────────────────────────────────────

export const PRODUCT_IMAGES_INCLUDE = {
    mediaImage: true,
} as const

export const PRODUCT_INCLUDE = {
    category: { select: { id: true, name: true, icon: true } },
    productImages: {
        orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
        include: { mediaImage: true },
    },
    variants: {
        orderBy: { order: 'asc' as const },
        include: { variantImages: { include: { mediaImage: true } } },
    },
    productPrices: {
        include: {
            priceLabel: true,
            currency: true,
        },
        orderBy: { createdAt: 'asc' as const },
    },
} as const
