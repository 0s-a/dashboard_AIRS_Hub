import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    validateApiKey,
    apiError,
    apiSuccess,
    normalizePhonePatterns,
    validatePhoneInput,
} from '@/lib/api-utils'

// GET /api/v1/bot/persons/search?phone=xxx
// Aliases accepted: q, value (for backward-compatibility with existing bots)
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)

        // Accept phone as primary param; q and value are aliases for backward-compatibility
        const raw = searchParams.get('phone')
            || searchParams.get('q')
            || searchParams.get('value')

        if (!raw || !raw.trim()) {
            return apiError('يجب تمرير رقم الهاتف عبر المعامل phone', 400, { code: 'MISSING_PHONE' })
        }

        // Validate that the input looks like a phone number
        const cleaned = validatePhoneInput(raw.trim())
        if (!cleaned) {
            return apiError(
                'رقم الهاتف غير صالح — يجب أن يحتوي على أرقام فقط ولا يقل عن 7 خانات',
                400,
                { code: 'INVALID_PHONE' }
            )
        }

        // Generate all format variants (Saudi 05/966/5, Yemeni 967, etc.)
        const patterns = normalizePhonePatterns(raw.trim())

        // Single query — exact match on any contact value variant
        const person = await prisma.person.findFirst({
            where: {
                contacts: {
                    some: {
                        value: { in: patterns },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                isActive: true,
                source: true,
                groupName: true,
                groupNumber: true,
                lastInteraction: true,
                createdAt: true,

                contacts: {
                    select: {
                        id: true,
                        type: true,
                        value: true,
                        label: true,
                        isPrimary: true,
                    },
                    orderBy: { isPrimary: 'desc' },
                },

                priceLabels: {
                    include: {
                        priceLabel: { select: { id: true, name: true } },
                    },
                },

                personCurrencies: {
                    include: {
                        currency: {
                            select: { id: true, name: true, code: true, symbol: true },
                        },
                    },
                },

                tags: {
                    include: {
                        tag: { select: { id: true, name: true } },
                    },
                },

                _count: {
                    select: { orders: true },
                },

                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        createdAt: true,
                        status: true,
                    },
                },
            },
        })

        if (!person) {
            return apiSuccess(null, 200, {
                found: false,
                meta: { phone: raw.trim(), patterns },
            })
        }

        // Shape the response — flatten junction tables
        const data = {
            id: person.id,
            name: person.name,
            isActive: person.isActive,
            source: person.source,
            groupName: person.groupName,
            groupNumber: person.groupNumber,
            lastInteraction: person.lastInteraction,
            createdAt: person.createdAt,

            contacts: person.contacts,

            priceLabels: person.priceLabels.map(pl => pl.priceLabel),

            currencies: person.personCurrencies.map(pc => pc.currency),

            tags: person.tags.map(t => t.tag),

            stats: {
                totalOrders: person._count.orders,
                lastOrderAt: person.orders[0]?.createdAt ?? null,
                lastOrderStatus: person.orders[0]?.status ?? null,
            },
        }

        return apiSuccess(data, 200, {
            found: true,
            meta: { phone: raw.trim(), patterns },
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/search]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
