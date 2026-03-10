import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-utils'
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
    groupNumber: z.string().optional().nullable(), // Alternative: find person by group number
    notes: z.string().optional().nullable(),
    items: z.array(OrderItemSchema).min(1, 'يجب أن يحتوي الطلب على منتج واحد على الأقل'),
})

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

async function generateOrderNumber(): Promise<string> {
    const last = await prisma.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
    })
    const next = last ? parseInt(last.orderNumber, 10) + 1 : 1
    return String(next).padStart(4, '0')
}

async function resolveProductPrice(productId: string, priceLabelId: string) {
    return prisma.productPrice.findFirst({
        where: { productId, priceLabelId },
        include: { currency: true },
    })
}

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
            return NextResponse.json(
                { error: 'بيانات غير صالحة', details: parsed.error.flatten() },
                { status: 400 }
            )
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
                return NextResponse.json(
                    { error: `لا توجد تسعيرة للمنتج ${item.productId} مع التسعيرة ${item.priceLabelId}` },
                    { status: 400 }
                )
            }
            resolvedItems.push({
                productId: item.productId,
                priceLabelId: item.priceLabelId,
                variantId: item.variantId ?? null,
                unitPrice: pp.value,
                currencyId: pp.currencyId,
                quantity: item.quantity,
                notes: item.notes ?? null,
            })
        }

        // ── Calculate total ──
        const totalAmount = resolvedItems.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity,
            0
        )

        // ── Create order ──
        const orderNumber = await generateOrderNumber()

        const order = await prisma.order.create({
            data: {
                orderNumber,
                personId: resolvedPersonId,
                notes: notes ?? null,
                totalAmount,
                items: {
                    create: resolvedItems,
                },
            },
            include: {
                person: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, itemNumber: true } },
                        priceLabel: { select: { id: true, name: true } },
                        currency: { select: { id: true, name: true, symbol: true, code: true } },
                        variant: { select: { id: true, name: true, hex: true, type: true } },
                    },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: order,
        }, { status: 201 })
    } catch (error: any) {
        console.error('API Error [POST /orders]:', error?.message || error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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
                return NextResponse.json({
                    success: true,
                    data: [],
                    count: 0,
                    pagination: { total: 0, page, limit, totalPages: 0 },
                })
            }
        }

        if (status) {
            where.status = status
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    person: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, itemNumber: true } },
                            priceLabel: { select: { id: true, name: true } },
                            currency: { select: { id: true, name: true, symbol: true, code: true } },
                            variant: { select: { id: true, name: true, hex: true, type: true } },
                        },
                    },
                },
            }),
            prisma.order.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: orders,
            count: orders.length,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error: any) {
        console.error('API Error [GET /orders]:', error?.message || error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
