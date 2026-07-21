// ============================================================
// Product Types — Centralized type definitions for inventory module
// ============================================================

export type ProductImage = {
    url: string
    alt?: string
    isPrimary: boolean
    order?: number
}

export type ImageEntry = { url?: string; alt?: string; isPrimary: boolean; order?: number }

export type ProductAttributeInput = {
    attributeId: string
    value: string
}

export interface ProductInput {
    name: string
    itemNumber: string
    slug?: string
    brandId: string
    description?: string | null
    familyId: string
    productAttributes?: ProductAttributeInput[]
    alternativeNames?: string[]
    tags?: string[]
    isAvailable?: boolean
}

export type SerializedProductFamilyRef = {
    id: string
    code: string
    name: string
}

export type SerializedPrice = {
    id: string
    priceLabelId: string
    priceLabelName: string
    value: number
    unitId: string
    unitName: string
    conversionFactor: number
    isAutoCalculated: boolean
}

export type ProductUnitEntry = {
    id: string
    unitId: string
    unitName: string
    conversionFactor: number
    barcode?: string | null
    isBase: boolean
    order: number
}

export type SerializedCategory = {
    id: string
    name: string
    code: string
}

export type SerializedProductAttribute = {
    id: string
    attributeId: string
    code: string
    name: string
    value: string
    examples?: string[]
}

export type PaginationMeta = {
    page: number
    limit: number
    total: number
    pages: number
    hasPrev: boolean
    hasNext: boolean
}

export type ProductsFilters = {
    search?: string
    categoryId?: string
    familyId?: string
    brandId?: string
    hasPrices?: boolean
    isAvailable?: boolean
    page?: number
    limit?: number
    sortBy?: 'createdAt' | 'name' | 'updatedAt' | 'itemNumber'
    sortDir?: 'asc' | 'desc'
}

export type SerializedProduct = {
    id: string
    itemNumber: string
    slug: string
    name: string
    /** Alias of name — kept for Bot API compatibility */
    displayName: string
    brandId: string
    brandRef: {
        id: string
        name: string
        code: string
        logo: string | null
    }
    description: string | null
    alternativeNames: string[]
    tags: string[]
    categoryId: string
    category: SerializedCategory
    familyId: string
    family: SerializedProductFamilyRef
    productAttributes: SerializedProductAttribute[]
    isAvailable: boolean
    order: number
    createdAt: string
    updatedAt: string
    mediaImages: ProductMediaImage[]
    primaryImage: string | null
    productPrices: SerializedPrice[]
    productUnits: ProductUnitEntry[]
    priceCount: number
}

export type ActionResult<T = void> =
    | { success: true;  data: T;     error?: never }
    | { success: false; data?: never; error: string }

export type ProductActionResult = ActionResult<SerializedProduct>

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
    productId?: string
}
