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
}

/** Image entry for create/update operations */
export type ImageEntry = { url?: string; alt?: string; isPrimary: boolean; order?: number }

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
    itemNumber?: string | null    // Optional manual code
    name: string
    brandId?: string | null
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
    isAvailable?: boolean
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
    productCode: string          // Auto-generated composite code
    itemNumber: string | null     // Optional manual code
    name: string
    brandId: string | null
    brandRef: {
        id: string
        name: string
        code: string
        logo: string | null
    } | null
    description: string | null
    isAvailable: boolean
    alternativeNames: string[] | null
    tags: string[] | null
    categoryId: string | null
    category: SerializedCategory | null
    createdAt: string
    updatedAt: string
    mediaImages: ProductMediaImage[]
    variants: ProductVariantWithImages[]
    productPrices: SerializedPrice[]
    productUnits: ProductUnitEntry[]
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
    variantIds?: string[]
}
