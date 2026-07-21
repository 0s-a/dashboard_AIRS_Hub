/**
 * Arabic / multilingual search query normalization.
 * Applied to Bot search inputs and Meilisearch indexed text fields.
 */

const ARABIC_DIACRITICS =
    /[\u064B-\u065F\u0670\u06D6-\u06ED]/g

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** Separators commonly inserted into item numbers by users. */
const SKU_SEPARATORS = /[\s\-_]+/g

function mapEasternDigits(ch: string): string {
    const ar = ARABIC_DIGITS.indexOf(ch)
    if (ar >= 0) return String(ar)
    const fa = PERSIAN_DIGITS.indexOf(ch)
    if (fa >= 0) return String(fa)
    return ch
}

/** Normalize text for search: trim, digits, diacritics, hamza, taa marbuta, alef maqsura. */
export function normalizeSearchQuery(input: string): string {
    let s = input.trim().replace(/\s+/g, ' ')
    if (!s) return s

    s = [...s].map(mapEasternDigits).join('')
    s = s.replace(ARABIC_DIACRITICS, '')
    s = s.replace(/[أإآٱ]/g, 'ا')
    s = s.replace(/ة/g, 'ه')
    s = s.replace(/ى/g, 'ي')
    // Latin case-fold so L/l and brand codes match filters/parse
    s = s.toLowerCase()

    return s
}

/**
 * Normalize item numbers for search/index: eastern digits + strip spaces/dashes/underscores.
 * Does not apply Arabic letter normalization (names stay on normalizeSearchQuery).
 */
export function normalizeItemNumberForSearch(input: string): string {
    const digits = [...input.trim()].map(mapEasternDigits).join('')
    return digits.replace(SKU_SEPARATORS, '').toLowerCase()
}

/** True when q looks like a single SKU token (no whitespace after trim). */
export function looksLikeSingleSkuToken(input: string): boolean {
    const trimmed = input.trim()
    if (!trimmed) return false
    return !/\s/.test(trimmed)
}
