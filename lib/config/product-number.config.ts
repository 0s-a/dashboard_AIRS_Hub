/**
 * Product number: 3 alphanumeric characters entered by the user.
 * Example: 001, A12, EL1
 */

export const PRODUCT_NUMBER_CONFIG = {
    length: 3,
    pattern: /^[A-Z0-9]{3}$/,
    get regex(): RegExp {
        return this.pattern
    },
} as const

/** Category code used in catalog (2 chars) — unrelated to product number */
export const CATEGORY_CODE_CONFIG = {
    length: 2,
    pattern: /^[A-Z0-9]{2}$/,
} as const

/** Brand code used in catalog (1 char) — unrelated to product number */
export const BRAND_CODE_CONFIG = {
    length: 1,
    pattern: /^[A-Z0-9]{1}$/,
} as const

/** @deprecated Use PRODUCT_NUMBER_CONFIG / CATEGORY_CODE_CONFIG / BRAND_CODE_CONFIG */
export const PRODUCT_CODE_CONFIG = {
    ...PRODUCT_NUMBER_CONFIG,
    category: CATEGORY_CODE_CONFIG,
    brand: BRAND_CODE_CONFIG,
} as const
