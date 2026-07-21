/**
 * Phone / contact value normalization — safe for client and server.
 * (Kept out of api-utils so Zod schemas in contact.config can import without pulling next/server.)
 */

/**
 * Generate search patterns for a phone number to match various formats.
 * Handles Saudi (966/05/5) and Yemeni (967) formats.
 */
export function normalizePhonePatterns(input: string): string[] {
    const patterns = new Set<string>([input])
    const digits = input.replace(/\D/g, '')

    if (digits.length >= 7) {
        patterns.add(digits)

        // Saudi: 05xxxxxxxx (10 digits)
        if (digits.startsWith('05') && digits.length === 10) {
            patterns.add(digits.substring(1)) // 5xxxxxxxx
            patterns.add('966' + digits.substring(1)) // 9665xxxxxxxx
        }
        // Saudi: 9665xxxxxxxx (12 digits)
        else if (digits.startsWith('9665') && digits.length === 12) {
            patterns.add(digits.substring(3)) // 5xxxxxxxx
            patterns.add('0' + digits.substring(3)) // 05xxxxxxxx
        }
        // Saudi: 5xxxxxxxx (9 digits)
        else if (digits.startsWith('5') && digits.length === 9) {
            patterns.add('0' + digits) // 05xxxxxxxx
            patterns.add('966' + digits) // 9665xxxxxxxx
        }
        // Yemeni: 967xxxxxxxxx (12+ digits)
        else if (digits.startsWith('967') && digits.length >= 12) {
            patterns.add(digits.substring(3)) // local number
        }
    }

    return Array.from(patterns)
}

/**
 * Validate that input looks like a phone number.
 * Returns cleaned digits or null if invalid.
 */
export function validatePhoneInput(input: string): string | null {
    const cleaned = input.replace(/[\s\-\+\(\)]/g, '')
    if (cleaned.length < 7 || !/^\d+$/.test(cleaned)) return null
    return cleaned
}

/**
 * Canonical storage form: digits only, Saudi → 9665xxxxxxxx, Yemeni → 967…
 * Returns null if the input is not a valid phone.
 */
export function canonicalizePhone(input: string): string | null {
    const cleaned = validatePhoneInput(input)
    if (!cleaned) return null

    // Saudi: 05xxxxxxxx
    if (cleaned.startsWith('05') && cleaned.length === 10) {
        return '966' + cleaned.substring(1)
    }
    // Saudi: 5xxxxxxxx
    if (cleaned.startsWith('5') && cleaned.length === 9) {
        return '966' + cleaned
    }
    // Saudi: already international
    if (cleaned.startsWith('9665') && cleaned.length === 12) {
        return cleaned
    }
    // Yemeni: already international
    if (cleaned.startsWith('967') && cleaned.length >= 12) {
        return cleaned
    }

    return cleaned
}
