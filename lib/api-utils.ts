import { NextRequest, NextResponse } from 'next/server'

// ────────────────────────────────────────────────────────
// API Key Validation
// ────────────────────────────────────────────────────────

const BOT_API_KEY = process.env.BOT_API_KEY

/**
 * Validates the x-api-key header against the BOT_API_KEY.
 * Returns null if valid, or a NextResponse error if invalid.
 *
 * Security: if BOT_API_KEY is not configured in .env, ALL requests are blocked
 * to prevent accidental open access (undefined !== undefined would pass).
 */
export function validateApiKey(req: NextRequest): NextResponse | null {
    if (!BOT_API_KEY) {
        console.error('[API] BOT_API_KEY is not configured — blocking all requests for safety')
        return NextResponse.json(
            { success: false, error: 'Service unavailable — API key not configured', code: 'MISCONFIGURED' },
            { status: 503 }
        )
    }
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== BOT_API_KEY) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized — invalid or missing x-api-key', code: 'UNAUTHORIZED' },
            { status: 401 }
        )
    }
    return null
}

// ────────────────────────────────────────────────────────
// Unified Response Helpers
// ────────────────────────────────────────────────────────

/**
 * Standard success response.
 * All bot API routes should use this for consistency.
 */
export function apiSuccess<T>(
    data: T,
    status = 200,
    meta?: Record<string, unknown>
): NextResponse {
    return NextResponse.json({ success: true, data, ...meta }, { status })
}

/**
 * Standard error response with optional machine-readable code.
 * All bot API routes should use this for consistency.
 */
export function apiError(
    message: string,
    status: number,
    options?: { code?: string; details?: unknown }
): NextResponse {
    const body: Record<string, unknown> = { success: false, error: message }
    if (options?.code)    body.code    = options.code
    if (options?.details !== undefined) body.details = options.details
    return NextResponse.json(body, { status })
}

// ────────────────────────────────────────────────────────
// Shared Prisma Include/Select constants (re-exported)
// ────────────────────────────────────────────────────────

export { CUSTOMER_INCLUDE } from '@/lib/prisma-includes'

// ────────────────────────────────────────────────────────
// Phone Number Normalization
// ────────────────────────────────────────────────────────

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
            patterns.add(digits.substring(1))            // 5xxxxxxxx
            patterns.add('966' + digits.substring(1))    // 9665xxxxxxxx
        }
        // Saudi: 9665xxxxxxxx (12 digits)
        else if (digits.startsWith('9665') && digits.length === 12) {
            patterns.add(digits.substring(3))            // 5xxxxxxxx
            patterns.add('0' + digits.substring(3))      // 05xxxxxxxx
        }
        // Saudi: 5xxxxxxxx (9 digits)
        else if (digits.startsWith('5') && digits.length === 9) {
            patterns.add('0' + digits)                   // 05xxxxxxxx
            patterns.add('966' + digits)                 // 9665xxxxxxxx
        }
        // Yemeni: 967xxxxxxxxx (12+ digits)
        else if (digits.startsWith('967') && digits.length >= 12) {
            patterns.add(digits.substring(3))            // local number
        }
    }

    return Array.from(patterns)
}

/**
 * Validate that input looks like a phone number.
 * Strips whitespace, dashes, plus signs, and parentheses, then checks
 * that the remaining string is all digits and at least 7 characters long.
 * Returns the cleaned digits string or null if invalid.
 */
export function validatePhoneInput(input: string): string | null {
    const cleaned = input.replace(/[\s\-\+\(\)]/g, '')
    if (cleaned.length < 7 || !/^\d+$/.test(cleaned)) return null
    return cleaned
}

// ────────────────────────────────────────────────────────
// Pagination Helper
// ────────────────────────────────────────────────────────

/**
 * Parse pagination params from URL search params.
 * Defaults: page=1, limit=50, max limit=100
 */
export function parsePagination(searchParams: URLSearchParams) {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit
    return { page, limit, skip }
}

/**
 * Build pagination metadata for response.
 */
export function paginationMeta(total: number, page: number, limit: number) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    }
}
