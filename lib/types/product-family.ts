// ─────────────────────────────────────────────────────────────
// Shared ProductFamily Types
// ─────────────────────────────────────────────────────────────

/** Shape returned by the DB (via getProductFamilies) */
export type ProductFamilyRow = {
    id: string
    name: string
    code: string
    description: string | null
    categoryId: string
    category: { id: string; name: string; code: string }
    createdAt: Date
    _count: { products: number }
}

/** Minimal family data needed by the edit form & sheet */
export type ProductFamilyFormData = Pick<
    ProductFamilyRow,
    'id' | 'name' | 'code' | 'description' | 'categoryId'
>

/** Payload sent to createProductFamily / updateProductFamily */
export type ProductFamilyPayload = {
    name: string
    code: string
    categoryId: string
    description?: string | null
}
