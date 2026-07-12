/** SKC attributes: keys = ProductAttribute.code, values = display strings */
export type SkcAttributes = Record<string, string>

export type SkcAttributeEntry = {
    code: string
    name: string
    value: string
}

export type SkcAttributeCatalogItem = {
    code: string
    name: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates and normalizes SKC attributes against the ProductAttribute catalog.
 * Returns null when empty or when raw is null/undefined.
 * @throws Error with Arabic message on invalid shape or unknown keys
 */
export function normalizeSkcAttributes(
    raw: unknown,
    allowedCodes: Set<string>
): SkcAttributes | null {
    if (raw == null) return null
    if (!isPlainObject(raw)) {
        throw new Error('صيغة الصفات غير صالحة')
    }

    const out: SkcAttributes = {}
    for (const [code, value] of Object.entries(raw)) {
        const key = code.trim().toUpperCase()
        if (!key) continue
        if (!allowedCodes.has(key)) {
            throw new Error(`الخاصية ${key} غير معرّفة في كتalog الصفات`)
        }
        if (value == null || value === '') continue
        const str = String(value).trim()
        if (str) out[key] = str
    }

    return Object.keys(out).length > 0 ? out : null
}

/** Parse stored JSON from Prisma into SkcAttributes or null */
export function parseSkcAttributes(raw: unknown): SkcAttributes | null {
    if (raw == null) return null
    if (!isPlainObject(raw)) return null

    const out: SkcAttributes = {}
    for (const [code, value] of Object.entries(raw)) {
        const key = code.trim().toUpperCase()
        if (!key || value == null || value === '') continue
        const str = String(value).trim()
        if (str) out[key] = str
    }

    return Object.keys(out).length > 0 ? out : null
}

/** Join stored attributes with catalog for display (name + value) */
export function resolveSkcAttributeEntries(
    attributes: SkcAttributes | null | undefined,
    catalog: SkcAttributeCatalogItem[]
): SkcAttributeEntry[] {
    if (!attributes) return []

    const nameByCode = new Map(catalog.map(c => [c.code.toUpperCase(), c.name]))
    return Object.entries(attributes)
        .map(([code, value]) => ({
            code,
            name: nameByCode.get(code.toUpperCase()) ?? code,
            value,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}
