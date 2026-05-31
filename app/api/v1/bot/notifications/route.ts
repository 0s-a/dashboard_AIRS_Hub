import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateApiKey, apiError, apiSuccess, parsePagination, paginationMeta } from '@/lib/api-utils'

const NotificationType = z.enum(['out_of_stock', 'not_found'])

const CreateNotificationSchema = z.object({
    type: NotificationType,
    searchQuery: z.string().min(1, 'searchQuery is required'),
    productId: z.string().optional().nullable(),
    productName: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
})

// POST /api/v1/bot/notifications — Create an AI notification
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const rawBody = await req.json()
        const parsed = CreateNotificationSchema.safeParse(rawBody)

        if (!parsed.success) {
            return apiError('Missing or invalid fields', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const { type, searchQuery, productId, productName, phoneNumber, customerId, source } = parsed.data

        // Validate foreign keys — ignore invalid IDs instead of failing
        let validProductId: string | null = null
        let validCustomerId: string | null = null

        if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
            validProductId = product?.id ?? null
        }
        if (customerId) {
            const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } })
            validCustomerId = customer?.id ?? null
        }

        const notification = await prisma.aiNotification.create({
            data: {
                type,
                searchQuery,
                productId: validProductId,
                productName: productName || null,
                customerId: validCustomerId,
                phoneNumber: phoneNumber || null,
                source: source || 'bot',
            },
        })

        return apiSuccess(notification, 201)
    } catch (error) {
        console.error('API Error [POST /notifications]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}

// GET /api/v1/bot/notifications — List notifications with pagination
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const type    = searchParams.get('type')
        const isRead  = searchParams.get('isRead')
        const { page, limit, skip } = parsePagination(searchParams)

        const where: any = {}
        if (type) where.type = type
        if (isRead === 'true')  where.isRead = true
        if (isRead === 'false') where.isRead = false

        const [total, notifications, unreadCount] = await Promise.all([
            prisma.aiNotification.count({ where }),
            prisma.aiNotification.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.aiNotification.count({ where: { isRead: false } }),
        ])

        return apiSuccess(notifications, 200, {
            count: notifications.length,
            unreadCount,
            pagination: paginationMeta(total, page, limit),
        })
    } catch (error) {
        console.error('API Error [GET /notifications]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
