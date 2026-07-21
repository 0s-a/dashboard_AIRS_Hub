/**
 * Resolve the display name for a product, respecting family name inheritance.
 */
export function resolveProductDisplayName(product: {
    name: string
    inheritsFamilyName?: boolean | null
    family?: { name: string } | null
}): string {
    if (product.inheritsFamilyName && product.family?.name?.trim()) {
        return product.family.name.trim()
    }
    return product.name?.trim() || ''
}
