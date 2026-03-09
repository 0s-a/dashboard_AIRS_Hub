import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ────────────────────────────────────────────────────────
// API Key Validation
// ────────────────────────────────────────────────────────

const BOT_API_KEY = process.env.BOT_API_KEY

/**
 * Validates the x-api-key header against the BOT_API_KEY.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function validateApiKey(req: NextRequest): NextResponse | null {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
}

// ────────────────────────────────────────────────────────
// Shared Prisma Include/Select constants
// ────────────────────────────────────────────────────────

/** Standard include for person queries across all endpoints */
export const PERSON_INCLUDE = {
    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
    personType: { select: { id: true, name: true, color: true, icon: true } },
    priceLabels: { include: { priceLabel: { select: { id: true, name: true } } } },
} as const

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

// ────────────────────────────────────────────────────────
// Currency Resolution
// ────────────────────────────────────────────────────────

/**
 * Resolve currency UUID arrays (stored as JSON) to full Currency objects.
 * Works for an array of persons.
 */
export async function resolveCurrencies(persons: any[]): Promise<any[]> {
    const allIds = new Set<string>()
    for (const p of persons) {
        if (Array.isArray(p.currencies)) {
            p.currencies.forEach((id: string) => allIds.add(id))
        }
    }
    if (allIds.size === 0) return persons

    const currencies = await prisma.currency.findMany({
        where: { id: { in: Array.from(allIds) } },
        select: { id: true, name: true, code: true, symbol: true },
    })
    const map = new Map(currencies.map(c => [c.id, c]))

    return persons.map(p => ({
        ...p,
        currencies: Array.isArray(p.currencies)
            ? p.currencies.map((id: string) => map.get(id) || { id }).filter(Boolean)
            : [],
    }))
}

/**
 * Resolve currency UUIDs for a single person.
 */
export async function resolveCurrenciesSingle(person: any): Promise<any> {
    if (!person || !Array.isArray(person.currencies) || person.currencies.length === 0) {
        return { ...person, currencies: [] }
    }
    const [enriched] = await resolveCurrencies([person])
    return enriched
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
