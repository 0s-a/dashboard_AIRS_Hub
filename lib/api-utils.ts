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
            {
                success: false,
                error: 'الخدمة غير متاحة — مفتاح API غير مضبوط',
                code: 'MISCONFIGURED',
            },
            { status: 503 }
        )
    }
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== BOT_API_KEY) {
        return NextResponse.json(
            {
                success: false,
                error: 'غير مصرح — مفتاح x-api-key ناقص أو غير صحيح',
                code: 'UNAUTHORIZED',
            },
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
 * Used by Dashboard routes and low-level helpers. Prefer `botApiError` for Bot HTTP.
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

/**
 * Bot business error — always HTTP 200 so automation (n8n tools) does not stop.
 * Callers still pass a logical status for readability; it is not sent as HTTP status.
 * Auth failures stay in `validateApiKey` (401 / 503). Branch on `success` + `code`.
 */
export function botApiError(
    message: string,
    _logicalStatus: number,
    options?: { code?: string; details?: unknown }
): NextResponse {
    return apiError(message, 200, options)
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
