/**
 * Helpers for product attribute display and parsing.
 */

export type AttrLike = {
    code?: string
    name?: string
    value: string
}

export function parseExamples(examples: unknown): string[] {
    if (!Array.isArray(examples)) return []
    return examples.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

export function formatProductAttributes(
    attrs: AttrLike[] | null | undefined,
    separator = ' · '
): string {
    if (!attrs?.length) return ''
    return attrs
        .map(a => a.value?.trim())
        .filter(Boolean)
        .join(separator)
}

export function formatProductAttributeLabels(
    attrs: AttrLike[] | null | undefined,
    separator = ' · '
): string {
    if (!attrs?.length) return ''
    return attrs
        .map(a => {
            const value = a.value?.trim()
            if (!value) return ''
            const label = a.name?.trim()
            return label ? `${label}: ${value}` : value
        })
        .filter(Boolean)
        .join(separator)
}

export function getAttrValue(
    attrs: AttrLike[] | null | undefined,
    code: string
): string | null {
    const found = attrs?.find(a => a.code === code)
    const value = found?.value?.trim()
    return value || null
}
