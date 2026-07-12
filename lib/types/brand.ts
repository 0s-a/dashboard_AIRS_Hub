// ─────────────────────────────────────────────────────────────
// Shared Brand Types
// Used across: columns, form, sheet, and server actions
// ─────────────────────────────────────────────────────────────

/** Shape returned by the DB (via getBrands) */
export type BrandRow = {
    id: string
    name: string
    code: string
    logo: string | null
    description: string | null
    createdAt: Date
    _count: { products: number }
}

/** Minimal brand data needed by the edit form & sheet */
export type BrandFormData = Pick<BrandRow, "id" | "name" | "code" | "logo" | "description">

/** Payload sent to createBrand / updateBrand */
export type BrandPayload = {
    name: string
    code: string        // required — exactly 1 uppercase letter or digit
    logo?: string | null
    description?: string | null
}
