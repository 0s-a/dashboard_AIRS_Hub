/**
 * Color code: 2–4 alphanumeric characters entered by the user.
 * Example: RD, RED, GLD1
 */

export const COLOR_CODE_CONFIG = {
    minLength: 2,
    maxLength: 4,
    pattern: /^[A-Z0-9]{2,4}$/,
    get regex(): RegExp {
        return this.pattern
    },
} as const

export const HEX_CODE_CONFIG = {
    pattern: /^#[0-9A-Fa-f]{6}$/,
    get regex(): RegExp {
        return this.pattern
    },
} as const

/** Default color for single-variant products */
export const DEFAULT_COLOR_CODE = 'ST' as const
