/**
 * ─── Product Code Configuration ────────────────────────────
 * Central config for composite product code generation.
 *
 * Format: {CATEGORY_CODE}-{BRAND_CODE}-{SEQUENCE}
 * Example: ELC-AP-0001
 *
 * productCode is stored as a plain String in the Product table.
 * ProductCodeSequence table tracks the last-used counter per
 * category+brand combo to guarantee numbers are NEVER reused.
 */

export const PRODUCT_CODE_CONFIG = {
    /** Separator between segments */
    separator: '-',

    /** Category segment — fallback when no category is assigned */
    category: {
        fallbackCode: 'GEN',    // "General" — used when categoryId is null
        length: 3,              // Must match Category.code length
    },

    /** Brand segment — fallback when no brand is assigned */
    brand: {
        fallbackCode: 'XX',     // "No Brand" — used when brandId is null
        length: 2,              // Must match Brand.code length
    },

    /** Sequential segment — auto-incrementing, never reused */
    sequence: {
        length: 4,              // Padded digits (0001–9999)
        padChar: '0',           // Left-padding character
    },

    /** Regex to validate a product code */
    get regex(): RegExp {
        const { category, brand, sequence, separator: sep } = this
        return new RegExp(
            `^[A-Z0-9]{${category.length}}` +
            `\\${sep}[A-Z0-9]{${brand.length}}` +
            `\\${sep}\\d{${sequence.length}}$`
        )
    },

    /** Max possible products per category+brand combo */
    get maxPerCombo(): number {
        return 10 ** this.sequence.length  // 10000 for length=4
    },
} as const
