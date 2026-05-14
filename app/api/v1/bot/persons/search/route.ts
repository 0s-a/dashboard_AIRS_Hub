import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess, PERSON_INCLUDE, normalizePhonePatterns, parsePagination, paginationMeta } from '@/lib/api-utils'

// GET /api/v1/bot/persons/search?q=xxx or ?value=xxx or ?phone=xxx
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q') || searchParams.get('value') || searchParams.get('phone') || searchParams.get('email')
        const { page, limit, skip } = parsePagination(searchParams)

        if (!q) {
            return apiError('يجب تمرير q أو value كمعلمة بحث', 400, { code: 'MISSING_PARAM' })
        }

        // Build search patterns using shared normalizer
        const patterns = normalizePhonePatterns(q)

        // Universal Search across all contact types
        const [persons, users] = await Promise.all([
            prisma.person.findMany({
                where: {
                    contacts: {
                        some: {
                            OR: patterns.map(p => ({
                                value: { contains: p, mode: 'insensitive' }
                            }))
                        }
                    }
                },
                include: PERSON_INCLUDE,
                take: limit,
                skip,
            }),
            prisma.user.findMany({
                where: {
                    contacts: {
                        some: {
                            OR: patterns.map(p => ({
                                value: { contains: p, mode: 'insensitive' }
                            }))
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                },
                take: limit,
                skip,
            })
        ])

        const enrichedPersons = persons.map(p => ({
            _type: 'customer',
            id: p.id,
            name: p.name,
            isActive: p.isActive,
            contacts: p.contacts,
            priceLabels: p.priceLabels.map(pl => pl.priceLabel),
            currencies: p.personCurrencies.map(pc => pc.currency),
        }))

        const mappedUsers = users.map(u => ({
            _type: 'user',
            id: u.id,
            name: u.name,
        }))

        // Combine and limit to requested size
        const combined = [...enrichedPersons, ...mappedUsers].slice(0, limit)
        const firstResult = combined[0]

        return apiSuccess(combined, 200, {
            personId: firstResult?._type === 'customer' ? firstResult.id : null,
            userId: firstResult?._type === 'user' ? firstResult.id : null,
            count: combined.length,
            pagination: paginationMeta(combined.length, page, limit),
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/search]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
