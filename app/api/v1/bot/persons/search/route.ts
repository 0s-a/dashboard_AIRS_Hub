import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess, PERSON_INCLUDE, resolveCurrencies, normalizePhonePatterns, parsePagination, paginationMeta } from '@/lib/api-utils'

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
                    username: true,
                    role: true,
                    color: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    updatedAt: true,
                    contacts: {
                        select: {
                            id: true,
                            type: true,
                            value: true,
                            label: true,
                            isPrimary: true,
                        }
                    }
                },
                take: limit,
                skip,
            })
        ])

        let enrichedPersons = persons.map(p => ({ ...p, _type: 'person' })) as any[]
        try {
            enrichedPersons = await resolveCurrencies(enrichedPersons)
        } catch (currError) {
            console.error('Currency resolution failed (non-fatal):', currError)
        }

        const mappedUsers = users.map(u => ({ ...u, _type: 'user' }))

        // Combine and limit to requested size
        const combined = [...enrichedPersons, ...mappedUsers].slice(0, limit)
        const firstResult = combined[0]

        return apiSuccess(combined, 200, {
            personId: firstResult?._type === 'person' ? firstResult.id : null,
            userId: firstResult?._type === 'user' ? firstResult.id : null,
            count: combined.length,
            pagination: paginationMeta(combined.length, page, limit),
        })
    } catch (error: any) {
        console.error('API Error [GET /persons/search]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
