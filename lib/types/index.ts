// ============================================================
// Shared types for the entire application
// ============================================================

// ─── Result Pattern ─────────────────────────────────────────
// Unified response type for all server actions

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; details?: unknown }

export type ActionResultList<T> =
    | { success: true; data: T[] }
    | { success: false; error: string; data: T[] }

// ─── Entity Summaries ───────────────────────────────────────
// Lightweight types for list views and select dropdowns

export interface PersonSummary {
    id: string
    name: string | null
}

export interface ProductSummary {
    id: string
    itemNumber: string
    name: string
    brand: string | null
    isAvailable: boolean
}

export interface CategorySummary {
    id: string
    name: string
    icon: string | null
}

export interface CurrencySummary {
    id: string
    name: string
    code: string
    symbol: string
}

export interface PriceLabelSummary {
    id: string
    name: string
}

export interface VariantSummary {
    id: string
    name: string
    type: string
    hex: string | null
    suffix: string
}

export interface PersonTypeSummary {
    id: string
    name: string
    color: string | null
    icon: string | null
}

// ─── Full Entity Types (with relations) ─────────────────────

export interface ContactFull {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

export interface PersonFull {
    id: string
    name: string | null
    address: string | null
    notes: string | null
    source: string | null
    isActive: boolean
    groupName: string | null
    groupNumber: string | null
    lastInteraction: Date | string
    createdAt: Date | string
    updatedAt: Date | string
    contacts: ContactFull[]
    personType: PersonTypeSummary | null
    currencies: CurrencySummary[]
    priceLabels: { priceLabel: PriceLabelSummary }[]
}

export interface VariantFull {
    id: string
    variantNumber: string
    suffix: string
    name: string
    type: string
    hex: string | null
    price: number | null
    order: number
    isDefault: boolean
}

export interface ProductPriceFull {
    id: string
    priceLabelId: string
    priceLabelName: string
    currencyId: string
    currencySymbol: string
    currencyName: string
    value: number
    unitId: string
    unitName: string
    conversionFactor: number
    isAutoCalculated: boolean
}

// ─── Order Types ────────────────────────────────────────────

export interface OrderItemFull {
    id: string
    productId: string | null
    product: { id: string; name: string; itemNumber: string } | null
    priceLabelId: string | null
    priceLabel: PriceLabelSummary | null
    variantId: string | null
    variant: { id: string; name: string; hex: string | null; type: string } | null
    unitPrice: number
    currencyId: string | null
    currency: CurrencySummary | null
    quantity: number
    notes: string | null
}

export interface OrderFull {
    id: string
    orderNumber: string
    personId: string | null
    person: PersonSummary | null
    status: string
    notes: string | null
    totalAmount: number | null
    items: OrderItemFull[]
    createdAt: Date | string
    updatedAt: Date | string
}

// ─── Order Status ───────────────────────────────────────────

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
