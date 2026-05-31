'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
    safeAction,
    safeActionWithRevalidation,
    generateItemNumber,
    resolveProductPrice,
} from '@/lib/action-utils'
import { validateOrderStatus, VALID_ORDER_STATUSES } from '@/lib/order-constants'
import { ORDER_INCLUDE } from '@/lib/prisma-includes'

// ============================================================
// Types
// ============================================================

export interface OrderItemInput {
    productId: string
    priceLabelId: string
    variantId?: string | null
    quantity: number
    notes?: string | null
}

export interface CreateOrderData {
    customerId?: string | null
    notes?: string | null
    items: OrderItemInput[]
}

export interface UpdateOrderData {
    customerId?: string | null
    notes?: string | null
    status?: string
    items?: OrderItemInput[]
}

// ============================================================
// Internal: Resolve items with prices
// ============================================================

interface ResolvedItem {
    productId: string
    priceLabelId: string
    variantId: string | null
    unitPrice: number
    currencyId: string | null
    quantity: number
    notes: string | null
}

async function resolveItems(items: OrderItemInput[]): Promise<ResolvedItem[]> {
    const resolved: ResolvedItem[] = []

    for (const item of items) {
        const pp = await resolveProductPrice(item.productId, item.priceLabelId)
        if (!pp) {
            throw new Error(`لا توجد تسعيرة مرتبطة بالمنتج المختار`)
        }
        resolved.push({
            productId: item.productId,
            priceLabelId: item.priceLabelId,
            variantId: item.variantId ?? null,
            unitPrice: Number(pp.value),
            currencyId: pp.currencyId,
            quantity: item.quantity,
            notes: item.notes ?? null,
        })
    }

    return resolved
}

function calcTotal(items: ResolvedItem[]): number {
    return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}

// ============================================================
// Read
// ============================================================

/**
 * Fetch orders with pagination.
 * Defaults: page=1, limit=50
 */
export async function getOrders(opts?: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, opts?.page ?? 1)
    const limit = Math.max(1, Math.min(100, opts?.limit ?? 50))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (opts?.status) where.status = opts.status

    return safeAction(
        async () => {
            const [data, total] = await Promise.all([
                prisma.order.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                    include: ORDER_INCLUDE,
                }),
                prisma.order.count({ where }),
            ])
            return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
        },
        'تعذّر جلب الطلبات'
    )
}

/**
 * Get order stats (counts by status) — computed at DB level.
 */
export async function getOrderStats() {
    return safeAction(
        async () => {
            const [total, pending, delivered, cancelled] = await Promise.all([
                prisma.order.count(),
                prisma.order.count({ where: { status: 'pending' } }),
                prisma.order.count({ where: { status: 'delivered' } }),
                prisma.order.count({ where: { status: 'cancelled' } }),
            ])
            return { total, pending, delivered, cancelled }
        },
        'تعذّر جلب الإحصائيات'
    )
}

export async function getOrderById(id: string) {
    return safeAction(
        async () => {
            const order = await prisma.order.findUnique({
                where: { id },
                include: ORDER_INCLUDE,
            })
            if (!order) throw Object.assign(new Error('الطلب غير موجود'), { code: 'P2025' })
            return order
        },
        'تعذّر جلب الطلب'
    )
}

// ============================================================
// Create
// ============================================================

export async function createOrder(data: CreateOrderData) {
    return safeActionWithRevalidation(
        async () => {
            const resolvedItems = await resolveItems(data.items)
            const totalAmount = calcTotal(resolvedItems)

            // Wrap in transaction to prevent order number race condition
            return prisma.$transaction(async (tx) => {
                const orderNumber = await generateItemNumber('order')

                return tx.order.create({
                    data: {
                        orderNumber,
                        customerId: data.customerId ?? null,
                        notes: data.notes ?? null,
                        totalAmount,
                        items: { create: resolvedItems },
                    },
                })
            })
        },
        '/orders',
        'تعذّر إنشاء الطلب'
    )
}

// ============================================================
// Update
// ============================================================

export async function updateOrder(id: string, data: UpdateOrderData) {
    return safeActionWithRevalidation(
        async () => {
            // Validate status if provided
            if (data.status !== undefined) {
                const valid = validateOrderStatus(data.status)
                if (!valid) throw new Error(`حالة غير صالحة: ${data.status}`)
            }

            let totalAmount: number | undefined
            let itemsPayload: { deleteMany: Record<string, never>; create: ResolvedItem[] } | undefined

            if (data.items !== undefined) {
                const resolvedItems = await resolveItems(data.items)
                totalAmount = calcTotal(resolvedItems)
                itemsPayload = {
                    deleteMany: {},
                    create: resolvedItems,
                }
            }

            // Wrap in transaction so items delete + create is atomic
            return prisma.$transaction(async (tx) => {
                return tx.order.update({
                    where: { id },
                    data: {
                        customerId: data.customerId !== undefined ? data.customerId ?? null : undefined,
                        notes: data.notes !== undefined ? data.notes ?? null : undefined,
                        status: data.status,
                        totalAmount,
                        ...(itemsPayload && { items: itemsPayload }),
                    },
                })
            })
        },
        '/orders',
        'تعذّر تعديل الطلب'
    )
}

export async function updateOrderStatus(id: string, status: string) {
    // Validate status before updating
    const validStatus = validateOrderStatus(status)
    if (!validStatus) {
        return {
            success: false as const,
            error: `حالة غير صالحة: "${status}". القيم المسموحة: ${VALID_ORDER_STATUSES.join(', ')}`,
        }
    }

    return safeActionWithRevalidation(
        () => prisma.order.update({ where: { id }, data: { status: validStatus } }),
        '/orders',
        'تعذّر تحديث حالة الطلب'
    )
}

// ============================================================
// Delete
// ============================================================

export async function deleteOrder(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await prisma.order.delete({ where: { id } })
            return null
        },
        '/orders',
        'تعذّر حذف الطلب'
    )
}

// ============================================================
// Helpers: Product price labels & variants (for order form)
// ============================================================

export async function getProductPriceLabels(productId: string) {
    return safeAction(
        async () => {
            const data = await prisma.productPrice.findMany({
                where: { productId },
                include: { priceLabel: true, currency: true },
            })
            // Serialize to convert Decimal → number for client components
            return JSON.parse(JSON.stringify(data))
        },
        'تعذّر جلب التسعيرات'
    )
}

export async function getProductVariants(productId: string) {
    return safeAction(
        () => prisma.variant.findMany({
            where: { productId },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                name: true,
                type: true,
                hex: true,
                suffix: true,
                isDefault: true,
            },
        }),
        'تعذّر جلب المتغيرات'
    )
}
