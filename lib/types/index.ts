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

export interface CustomerSummary {
    id: string
    name: string | null
}

export interface ItemSummary {
    id: string
    itemNumber: string
    name: string
    brand: string | null
}

/** @deprecated use ItemSummary */
export type ProductSummary = ItemSummary

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


// ─── Full Entity Types (with relations) ─────────────────────

export interface ContactFull {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

export interface CustomerFull {
    id: string
    name: string | null
    address: string | null
    notes: string | null
    source: string | null
    isActive: boolean
    lastInteraction: Date | string
    createdAt: Date | string
    updatedAt: Date | string
    contacts: ContactFull[]
    currencies: CurrencySummary[]
    priceLabel: { id: string; name: string; customerType: string | null } | null
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

export interface ItemPriceFull {
    id: string
    priceLabelId: string
    priceLabelName: string
    value: number
    unitId: string
    unitName: string
    conversionFactor: number
    isAutoCalculated: boolean
}

/** @deprecated use ItemPriceFull */
export type ProductPriceFull = ItemPriceFull

// ─── Order Types ────────────────────────────────────────────

export interface OrderItemFull {
    id: string
    itemId: string
    item: {
        id: string
        name: string
        itemNumber: string | null
        itemAttributes?: Array<{
            id: string
            value: string
            attribute?: { id: string; code: string; name: string } | null
        }>
        itemPrices?: Array<{
            priceLabelId: string
            value: number
            priceLabel?: { id: string; name: string; isDefault: boolean } | null
            currency?: { id: string; symbol: string; code: string } | null
        }>
    } | null
    unitId: string | null
    unit: { id: string; name: string; pluralName: string | null } | null
    quantity: number
    notes: string | null
    unitPrice: number | null
    currencyId: string | null
    currency: { id: string; symbol: string; code: string } | null
    priceLabelId: string | null
    priceLabel: { id: string; name: string } | null
}

export interface OrderFull {
    id: string
    orderNumber: string
    customerId: string | null
    customer: { id: string; name: string | null; priceLabelId: string | null } | null
    status: string
    notes: string | null
    deliveryInfo: string | null
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

