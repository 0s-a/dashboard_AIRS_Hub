import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'
import { generateItemNumber } from '@/lib/action-utils'
import { ORDER_INCLUDE } from '@/lib/prisma-includes'
import { z } from 'zod'

// ────────────────────────────────────────────────────────
// Validation Schema
// ────────────────────────────────────────────────────────

const OrderItemSchema = z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional().nullable(),
})

const CreateOrderSchema = z.object({
    customerId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(OrderItemSchema).min(1, 'يجب أن يحتوي الطلب على منتج واحد على الأقل'),
})

// ────────────────────────────────────────────────────────
// POST /api/v1/bot/orders — Create a new order
// ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const body = await req.json()
        const parsed = CreateOrderSchema.safeParse(body)

        if (!parsed.success) {
            return apiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const { customerId, notes, items } = parsed.data

        // ── Create order in transaction (prevents order number race condition) ──
        const order = await prisma.$transaction(async (tx) => {
            const orderNumber = await generateItemNumber('order')

            return tx.order.create({
                data: {
                    orderNumber,
                    customerId: customerId ?? null,
                    notes: notes ?? null,
                    items: {
                        create: items.map(it => ({
                            productId: it.productId,
                            variantId: it.variantId ?? null,
                            quantity: it.quantity,
                            notes: it.notes ?? null,
                        }))
                    },
                },
                include: ORDER_INCLUDE,
            })
        })

        return apiSuccess(order, 201)
    } catch (error: any) {
        console.error('API Error [POST /orders]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}

// ────────────────────────────────────────────────────────
// GET /api/v1/bot/orders — List orders (with optional filters)
// ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const customerId = searchParams.get('customerId')
        const status = searchParams.get('status')
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
        const skip = (page - 1) * limit

        // ── Build where clause ──
        const where: Record<string, unknown> = {}
        if (customerId) where.customerId = customerId
        if (status) where.status = status

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: ORDER_INCLUDE,
            }),
            prisma.order.count({ where }),
        ])

        return apiSuccess(orders, 200, {
            count: orders.length,
            pagination: {
                total, page, limit,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error: any) {
        console.error('API Error [GET /orders]:', error?.message || error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
