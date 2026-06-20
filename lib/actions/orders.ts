'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
    safeAction,
    safeActionWithRevalidation,
    generateItemNumber,
} from '@/lib/action-utils'
import { validateOrderStatus, VALID_ORDER_STATUSES } from '@/lib/order-constants'
import { ORDER_INCLUDE } from '@/lib/prisma-includes'

// ============================================================
// Types
// ============================================================

export interface OrderItemInput {
    productId: string
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
            return prisma.$transaction(async (tx) => {
                const orderNumber = await generateItemNumber('order')
                return tx.order.create({
                    data: {
                        orderNumber,
                        customerId: data.customerId ?? null,
                        notes: data.notes ?? null,
                        items: {
                            create: data.items.map(it => ({
                                productId: it.productId,
                                variantId: it.variantId ?? null,
                                quantity: it.quantity,
                                notes: it.notes ?? null,
                            }))
                        },
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
            if (data.status !== undefined) {
                const valid = validateOrderStatus(data.status)
                if (!valid) throw new Error(`حالة غير صالحة: ${data.status}`)
            }

            let itemsPayload: { deleteMany: Record<string, never>; create: any[] } | undefined

            if (data.items !== undefined) {
                itemsPayload = {
                    deleteMany: {},
                    create: data.items.map(it => ({
                        productId: it.productId,
                        variantId: it.variantId ?? null,
                        quantity: it.quantity,
                        notes: it.notes ?? null,
                    }))
                }
            }

            return prisma.$transaction(async (tx) => {
                return tx.order.update({
                    where: { id },
                    data: {
                        customerId: data.customerId !== undefined ? data.customerId ?? null : undefined,
                        notes: data.notes !== undefined ? data.notes ?? null : undefined,
                        status: data.status,
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
            // أولاً: جلب تسعيرات العملة الافتراضية فقط
            const defaultPrices = await prisma.productPrice.findMany({
                where: { productId, currency: { isDefault: true } },
                include: { priceLabel: true, currency: true },
                orderBy: { priceLabel: { name: 'asc' } },
            })

            // إذا لم توجد أسعار بالعملة الافتراضية → إرجاع جميع الأسعار كـ fallback
            const data = defaultPrices.length > 0
                ? defaultPrices
                : await prisma.productPrice.findMany({
                    where: { productId },
                    include: { priceLabel: true, currency: true },
                    orderBy: { priceLabel: { name: 'asc' } },
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
