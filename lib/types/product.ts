// ─────────────────────────────────────────────────────────────
// Product (SPU) Types — grouping + brand + category
// ─────────────────────────────────────────────────────────────

/** Shape returned by the DB (via getProducts) */
export type ProductRow = {
    id: string
    name: string
    code: string
    description: string | null
    categoryId: string
    brandId: string
    category: { id: string; name: string; code: string }
    brand: { id: string; name: string; code: string; logo: string | null }
    createdAt: Date
    _count: { items: number }
}

/** Minimal product data needed by the edit form & sheet */
export type ProductFormData = Pick<
    ProductRow,
    'id' | 'name' | 'code' | 'description' | 'categoryId' | 'brandId'
>

/** Payload sent to createProduct / updateProduct */
export type ProductPayload = {
    name: string
    code: string
    categoryId: string
    brandId: string
    description?: string | null
}

// ── Legacy SKU type aliases (prefer @/lib/types/item) ─────────
export type {
    SerializedPrice,
    ItemUnitEntry as ProductUnitEntry,
    ItemInput as ProductInput,
    SerializedItem as SerializedProduct,
    SerializedCategory,
    SerializedItemAttribute as SerializedProductAttribute,
    ItemsFilters as ProductsFilters,
    PaginationMeta,
    ItemAttributeInput as ProductAttributeInput,
    ItemMediaImage as ProductMediaImage,
    ImageEntry,
    ItemActionResult as ProductActionResult,
} from './item'
