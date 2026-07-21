// ─────────────────────────────────────────────────────────────
// Shared ProductFamily Types
// ─────────────────────────────────────────────────────────────

/** Shape returned by the DB (via getProductFamilies) */
export type ProductFamilyRow = {
    id: string
    name: string
    code: string
    description: string | null
    createdAt: Date
    _count: { products: number }
}

/** Minimal family data needed by the edit form & sheet */
export type ProductFamilyFormData = Pick<
    ProductFamilyRow,
    'id' | 'name' | 'code' | 'description'
>

/** Payload sent to createProductFamily / updateProductFamily */
export type ProductFamilyPayload = {
    name: string
    code: string
    description?: string | null
}
