// ============================================================
// Product Types — Centralized type definitions for inventory module
// ============================================================

// ─── Image Types ────────────────────────────────────────────

/**
 * Product Image Type (used in form inputs)
 */
export type ProductImage = {
    url: string
    alt?: string
    isPrimary: boolean
    order?: number
    mediaImageId?: string
}

/** Image entry for create/update operations */
export type ImageEntry = { url?: string; alt?: string; isPrimary: boolean; order?: number; mediaImageId?: string }

// ─── Image Helpers ──────────────────────────────────────────

/** Helper to get primary image from images array */
export function getPrimaryImage(images: ProductImage[] | null): ProductImage | null {
    if (!images || images.length === 0) return null
    return images.find(img => img.isPrimary) || images[0]
}

/** Helper to get primary image URL */
export function getPrimaryImageUrl(images: ProductImage[] | null): string | null {
    const primaryImage = getPrimaryImage(images)
    return primaryImage?.url || null
}

/** Validate images array */
export function validateProductImages(images: ProductImage[]): { valid: boolean; error?: string } {
    if (images.length === 0) {
        return { valid: false, error: 'يجب إضافة صورة واحدة على الأقل' }
    }
    if (images.length > 10) {
        return { valid: false, error: 'الحد الأقصى 10 صور' }
    }
    const primaryImages = images.filter(img => img.isPrimary)
    if (primaryImages.length === 0) {
        return { valid: false, error: 'يجب تحديد صورة رئيسية واحدة' }
    }
    if (primaryImages.length > 1) {
        return { valid: false, error: 'لا يمكن تحديد أكثر من صورة رئيسية واحدة' }
    }
    return { valid: true }
}

// ─── Product Input Types ─────────────────────────────────────

/** Input for creating/updating a product */
export interface ProductInput {
    itemNumber: string
    name: string
    brand?: string | null
    description?: string | null
    isAvailable?: boolean
    categoryId?: string | null
    alternativeNames?: string[]
    tags?: string[]
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
    brand?: string
    isAvailable?: boolean
    hasPrices?: boolean
    page?: number
    limit?: number
    sortBy?: 'createdAt' | 'name' | 'updatedAt'
    sortDir?: 'asc' | 'desc'
}

// ─── Full Product Detail Type (for detail page) ──────────────

/** Full product data shape for the product detail page */
export type ProductDetailData = {
    id: string
    itemNumber: string
    name: string
    brand: string | null
    description: string | null
    unit: string
    packaging: string | null
    productPrices: SerializedPrice[]
    productUnits?: ProductUnitEntry[]
    isAvailable: boolean
    variants: ProductVariantWithImages[]
    mediaImages: ProductMediaImage[]
    alternativeNames: string[] | null
    tags: string[] | null
    productTags: Array<{
        id: string
        name: string
        color: string | null
    }>
    createdAt: Date
    updatedAt: Date
}

/** Variant with image links — used in product detail */
export type ProductVariantWithImages = {
    id: string
    variantNumber: string
    suffix: string
    name: string
    type: string
    hex: string | null
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

/** Media image record used in gallery and product detail */
export type ProductMediaImage = {
    id: string
    mediaImageId: string
    url: string
    filename?: string
    alt?: string | null
    isPrimary: boolean
    order: number
    width?: number | null
    height?: number | null
    sizeBytes?: number | null
    variantIds?: string[]
}
