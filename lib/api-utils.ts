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

export { CUSTOMER_INCLUDE, BOT_CUSTOMER_WHERE } from '@/lib/prisma-includes'

// ────────────────────────────────────────────────────────
// Phone Number Normalization (re-exported from phone-utils)
// ────────────────────────────────────────────────────────

export {
    normalizePhonePatterns,
    validatePhoneInput,
    canonicalizePhone,
} from '@/lib/phone-utils'

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
