import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'
import { resolveProductPrice, generateItemNumber } from '@/lib/action-utils'
import { ORDER_INCLUDE } from '@/lib/prisma-includes'
import { z } from 'zod'

// ────────────────────────────────────────────────────────
// Validation Schema
// ────────────────────────────────────────────────────────

const OrderItemSchema = z.object({
    productId: z.string().uuid(),
    priceLabelId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional().nullable(),
})

const CreateOrderSchema = z.object({
    personId: z.string().uuid().optional().nullable(),
    groupNumber: z.string().optional().nullable(),
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

        const { personId, groupNumber, notes, items } = parsed.data

        // ── Resolve person ID ──
        let resolvedPersonId: string | null = personId ?? null

        if (!resolvedPersonId && groupNumber) {
            const person = await prisma.person.findFirst({
                where: { groupNumber },
                select: { id: true },
            })
            resolvedPersonId = person?.id ?? null
        }

        // ── Resolve prices for each item ──
        const resolvedItems: {
            productId: string
            priceLabelId: string
            variantId: string | null
            unitPrice: number
            currencyId: string | null
            quantity: number
            notes: string | null
        }[] = []

        for (const item of items) {
            const pp = await resolveProductPrice(item.productId, item.priceLabelId)
            if (!pp) {
                return apiError(
                    `لا توجد تسعيرة للمنتج ${item.productId} مع التسعيرة ${item.priceLabelId}`,
                    400,
                    { code: 'PRICE_NOT_FOUND' }
                )
            }
            resolvedItems.push({
                productId: item.productId,
                priceLabelId: item.priceLabelId,
                variantId: item.variantId ?? null,
                unitPrice: Number(pp.value),
                currencyId: pp.currencyId,
                quantity: item.quantity,
                notes: item.notes ?? null,
            })
        }

        // ── Calculate total ──
        const totalAmount = resolvedItems.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity, 0
        )

        // ── Create order ──
        const orderNumber = await generateItemNumber('order')

        const order = await prisma.order.create({
            data: {
                orderNumber,
                personId: resolvedPersonId,
                notes: notes ?? null,
                totalAmount,
                items: { create: resolvedItems },
            },
            include: ORDER_INCLUDE,
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
        const personId = searchParams.get('personId')
        const groupNumber = searchParams.get('groupNumber')
        const status = searchParams.get('status')
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
        const skip = (page - 1) * limit

        // ── Build where clause ──
        const where: any = {}

        if (personId) {
            where.personId = personId
        } else if (groupNumber) {
            const person = await prisma.person.findFirst({
                where: { groupNumber },
                select: { id: true },
            })
            if (person) {
                where.personId = person.id
            } else {
                return apiError('الشخص غير موجود', 404, { code: 'NOT_FOUND' })
            }
        }

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
