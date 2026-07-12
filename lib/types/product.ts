// ============================================================
// Product Types — Centralized type definitions for inventory module
// ============================================================

import type { SkuSpecKind } from '@/lib/config/sku-spec.config'

// ─── Image Types ────────────────────────────────────────────

/**
 * Product Image Type (used in form inputs)
 */
export type ProductImage = {
    url: string
    alt?: string
    isPrimary: boolean
    order?: number
}

/** Image entry for create/update operations */
export type ImageEntry = { url?: string; alt?: string; isPrimary: boolean; order?: number }

// ─── Product Input Types ─────────────────────────────────────

/** Input for creating/updating a product */
export interface ProductInput {
    name: string
    productNumber: string
    slug?: string
    brandId?: string | null
    description?: string | null
    categoryId?: string | null
    alternativeNames?: string[]
    tags?: string[]
    skuSpecKind?: SkuSpecKind
}

// ─── Serialized Types (returned to client) ───────────────────

/** Serialized price entry returned to the client */
export type SerializedPrice = {
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

/** Serialized product unit returned to the client */
export type ProductUnitEntry = {
    id: string
    unitId: string
    unitName: string
    conversionFactor: number
    barcode?: string | null
    isBase: boolean
    order: number
}

/** Serialized category returned to the client */
export type SerializedCategory = {
    id: string
    name: string
    code: string
    icon: string | null
}

// ─── Pagination ──────────────────────────────────────────────

export type PaginationMeta = {
    page: number
    limit: number
    total: number
    pages: number
    hasPrev: boolean
    hasNext: boolean
}

// ─── Filter Types ────────────────────────────────────────────

export type ProductsFilters = {
    search?: string
    categoryId?: string
    brandId?: string
    hasPrices?: boolean
    page?: number
    limit?: number
    sortBy?: 'createdAt' | 'name' | 'updatedAt'
    sortDir?: 'asc' | 'desc'
}

// ─── Serialized Product (output of serializeProduct) ─────────

/** The shape returned by serializeProduct() — used in table/list views */
export type SerializedProduct = {
    id: string
    productNumber: string
    slug: string
    name: string
    brandId: string | null
    brandRef: {
        id: string
        name: string
        code: string
        logo: string | null
    } | null
    description: string | null
    alternativeNames: string[]  // always an array, never null
    tags: string[]              // always an array, never null
    categoryId: string | null
    category: SerializedCategory | null
    skuSpecKind: SkuSpecKind
    createdAt: string
    updatedAt: string
    mediaImages: ProductMediaImage[]
    skcs: import('@/lib/types/skc').SerializedSKC[]
    skcCount: number
    productPrices: SerializedPrice[]
    productUnits: ProductUnitEntry[]
    /** @deprecated use skcs */
    variants: ProductVariantWithImages[]
}


/** Variant with image links — used in product detail */
export type ProductVariantWithImages = {
    id: string
    variantNumber: string
    suffix: string
    name: string
    type: string
    hex: string | null
    price?: number | null
    order: number
    isDefault: boolean
    imageCount: number
    images: Array<{
        id: string
        url: string
        filename?: string
        alt?: string | null
    }>
}

// ─── Action Result ───────────────────────────────────────────

/**
 * Standard response shape for all inventory Server Actions.
 * Use `success` to branch logic; `error` is always a human-readable Arabic string.
 */
export type ActionResult<T = void> =
    | { success: true;  data: T;     error?: never }
    | { success: false; data?: never; error: string }

/** Shorthand for actions that return a full serialized product */
export type ProductActionResult = ActionResult<SerializedProduct>

/** Media image record used in gallery and product detail */
export type ProductMediaImage = {
    id: string
    url: string
    filename?: string
    alt?: string | null
    isPrimary: boolean
    order: number
    width?: number | null
    height?: number | null
    sizeBytes?: number | null
    skcIds?: string[]
}
