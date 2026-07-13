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
import { requireAuth } from '@/lib/auth-utils'
import { resolveItemSnapshot } from '@/lib/orders/snapshot'

// ============================================================
// Types
// ============================================================

export interface OrderItemInput {
    productId: string
    quantity: number
    notes?: string | null
    unitId?: string | null
    // Snapshot — السعر المُثبَّت وقت إنشاء الطلب
    unitPrice?: number | null
    currencyId?: string | null
    priceLabelId?: string | null
}

export interface CreateOrderData {
    customerId?: string | null
    notes?: string | null
    deliveryInfo?: string | null
    items: OrderItemInput[]
}

export interface UpdateOrderData {
    customerId?: string | null
    notes?: string | null
    deliveryInfo?: string | null
    status?: string
    items?: OrderItemInput[]
}

export interface GetOrdersOptions {
    page?: number
    limit?: number
    status?: string
    customerId?: string    // فلتر بالعميل
    search?: string        // بحث برقم الطلب
    dateFrom?: string      // فلتر بالتاريخ (ISO string)
    dateTo?: string        // فلتر بالتاريخ
}


// ============================================================
// Read
// ============================================================

/**
 * Fetch orders with pagination + server-side filtering.
 * Defaults: page=1, limit=50
 */
export async function getOrders(opts?: GetOrdersOptions) {
    const page  = Math.max(1, opts?.page ?? 1)
    const limit = Math.max(1, Math.min(100, opts?.limit ?? 50))
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (opts?.status)     where.status     = opts.status
    if (opts?.customerId) where.customerId = opts.customerId
    if (opts?.search)     where.orderNumber = { contains: opts.search, mode: 'insensitive' }
    if (opts?.dateFrom || opts?.dateTo) {
        where.createdAt = {
            ...(opts.dateFrom ? { gte: new Date(opts.dateFrom) } : {}),
            ...(opts.dateTo   ? { lte: new Date(opts.dateTo)   } : {}),
        }
    }

    return safeAction(
        async () => {
            await requireAuth()
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
 * Get order stats (counts by status) — استعلام واحد بـ groupBy بدلاً من 6 استعلامات منفصلة.
 */
export async function getOrderStats() {
    return safeAction(
        async () => {
            await requireAuth()
            const [grouped, total] = await Promise.all([
                prisma.order.groupBy({
                    by: ['status'],
                    _count: { _all: true },
                }),
                prisma.order.count(),
            ])

            const byStatus = Object.fromEntries(
                grouped.map(g => [g.status, g._count._all])
            )

            return {
                total,
                pending:    byStatus['pending']    ?? 0,
                confirmed:  byStatus['confirmed']  ?? 0,
                processing: byStatus['processing'] ?? 0,
                shipped:    byStatus['shipped']    ?? 0,
                delivered:  byStatus['delivered']  ?? 0,
                cancelled:  byStatus['cancelled']  ?? 0,
            }
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
            await requireAuth()
            const itemCreates = await Promise.all(
                data.items.map(async (it) => {
                    const snapshot = await resolveItemSnapshot({
                        customerId: data.customerId,
                        productId: it.productId,
                        unitId: it.unitId,
                        unitPrice: it.unitPrice,
                        currencyId: it.currencyId,
                        priceLabelId: it.priceLabelId,
                    })
                    return {
                        productId: it.productId,
                        unitId: it.unitId ?? null,
                        quantity: it.quantity,
                        notes: it.notes ?? null,
                        unitPrice: snapshot.unitPrice,
                        currencyId: snapshot.currencyId,
                        priceLabelId: snapshot.priceLabelId,
                    }
                })
            )

            return prisma.$transaction(async (tx) => {
                const orderNumber = await generateItemNumber('order')
                return tx.order.create({
                    data: {
                        orderNumber,
                        customerId: data.customerId ?? null,
                        notes: data.notes ?? null,
                        deliveryInfo: data.deliveryInfo ?? null,
                        items: { create: itemCreates },
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
            await requireAuth()
            if (data.status !== undefined) {
                const valid = validateOrderStatus(data.status)
                if (!valid) throw new Error(`حالة غير صالحة: ${data.status}`)
            }

            let itemsPayload: { deleteMany: Record<string, never>; create: any[] } | undefined

            if (data.items !== undefined) {
                // حماية: رفض items فارغة بدلاً من حذف جميع البنود صامتاً
                if (data.items.length === 0) {
                    throw new Error('لا يمكن حفظ طلب بدون منتجات — أضف منتجاً واحداً على الأقل')
                }

                const customerId =
                    data.customerId !== undefined ? data.customerId : undefined
                const existing =
                    customerId === undefined
                        ? await prisma.order.findUnique({
                              where: { id },
                              select: { customerId: true },
                          })
                        : null
                const snapshotCustomerId =
                    customerId !== undefined ? customerId : existing?.customerId

                const createItems = await Promise.all(
                    data.items.map(async (it) => {
                        const snapshot = await resolveItemSnapshot({
                            customerId: snapshotCustomerId,
                            productId: it.productId,
                            unitId: it.unitId,
                            unitPrice: it.unitPrice,
                            currencyId: it.currencyId,
                            priceLabelId: it.priceLabelId,
                        })
                        return {
                            productId: it.productId,
                            unitId: it.unitId ?? null,
                            quantity: it.quantity,
                            notes: it.notes ?? null,
                            unitPrice: snapshot.unitPrice,
                            currencyId: snapshot.currencyId,
                            priceLabelId: snapshot.priceLabelId,
                        }
                    })
                )

                itemsPayload = {
                    deleteMany: {},
                    create: createItems,
                }
            }

            return prisma.$transaction(async (tx) => {
                return tx.order.update({
                    where: { id },
                    data: {
                        customerId:   data.customerId !== undefined ? data.customerId ?? null : undefined,
                        notes:        data.notes !== undefined ? data.notes ?? null : undefined,
                        deliveryInfo: data.deliveryInfo !== undefined ? data.deliveryInfo ?? null : undefined,
                        status:       data.status as any,
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
        async () => {
            await requireAuth()
            return prisma.order.update({ where: { id }, data: { status: validStatus as any } })
        },
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
            await requireAuth()
            await prisma.order.delete({ where: { id } })
            return null
        },
        '/orders',
        'تعذّر حذف الطلب'
    )
}

// ============================================================
// Helpers: Product price labels (for order form)
// ============================================================

export async function getProductPriceLabels(productId: string) {
    return safeAction(
        async () => {
            await requireAuth()

            const data = await prisma.productPrice.findMany({
                where: { productId },
                include: { priceLabel: true },
                orderBy: { priceLabel: { name: 'asc' } },
            })

            return JSON.parse(JSON.stringify(data))
        },
        'تعذّر جلب التسعيرات'
    )
}
