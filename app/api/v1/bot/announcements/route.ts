import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess, parsePagination, paginationMeta } from '@/lib/api-utils'

// GET /api/v1/bot/announcements — List announcements with filters and pagination
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') // 'sent' | 'draft' | 'sending' | etc.
        const { page, limit, skip } = parsePagination(searchParams)

        const where: any = {}
        // Default to 'sent' if no status provided (backward compat)
        if (status) {
            where.status = status
        } else {
            where.status = 'sent'
        }

        const [total, announcements] = await Promise.all([
            prisma.announcement.count({ where }),
            prisma.announcement.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    sentAt: true,
                    createdAt: true,
                    _count: { select: { messages: true } },
                },
                orderBy: { sentAt: 'desc' },
                skip,
                take: limit,
            }),
        ])

        return apiSuccess(announcements, 200, {
            count: announcements.length,
            pagination: paginationMeta(total, page, limit),
        })
    } catch (error) {
        console.error('API Error [GET /announcements]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
