// ============================================================
// Item Types — SKU (sellable unit) for inventory module
// Brand/category come from item.product (SPU)
// ============================================================

export type ItemImage = {
    url: string
    alt?: string
    isPrimary: boolean
    order?: number
}

export type ImageEntry = { url?: string; alt?: string; isPrimary: boolean; order?: number }

export type ItemAttributeInput = {
    attributeId: string
    value: string
}

export interface ItemInput {
    name: string
    itemNumber: string
    slug?: string
    productId: string
    description?: string | null
    itemAttributes?: ItemAttributeInput[]
    alternativeNames?: string[]
    tags?: string[]
    isAvailable?: boolean
}

export type SerializedProductRef = {
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

export type ItemUnitEntry = {
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

export type SerializedItemAttribute = {
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

export type ItemsFilters = {
    search?: string
    categoryId?: string
    productId?: string
    brandId?: string
    hasPrices?: boolean
    isAvailable?: boolean
    page?: number
    limit?: number
    sortBy?: 'createdAt' | 'name' | 'updatedAt' | 'itemNumber'
    sortDir?: 'asc' | 'desc'
}

export type SerializedItem = {
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
    productId: string
    product: SerializedProductRef
    itemAttributes: SerializedItemAttribute[]
    isAvailable: boolean
    order: number
    createdAt: string
    updatedAt: string
    mediaImages: ItemMediaImage[]
    primaryImage: string | null
    itemPrices: SerializedPrice[]
    itemUnits: ItemUnitEntry[]
    priceCount: number
}

export type ActionResult<T = void> =
    | { success: true;  data: T;     error?: never }
    | { success: false; data?: never; error: string }

export type ItemActionResult = ActionResult<SerializedItem>

export type ItemMediaImage = {
    id: string
    url: string
    filename?: string
    alt?: string | null
    isPrimary: boolean
    order: number
    width?: number | null
    height?: number | null
    sizeBytes?: number | null
    itemId?: string
}
