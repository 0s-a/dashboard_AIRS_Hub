'use server'

import { prisma } from '@/lib/prisma'
import {
    safeAction,
    safeActionWithRevalidation,
} from '@/lib/action-utils'
import { VALID_ORDER_STATUSES } from '@/lib/order-constants'
import { requireAuth } from '@/lib/auth-utils'
import {
    createOrder as createOrderService,
    deleteOrder as deleteOrderService,
    getOrderById as getOrderByIdService,
    listOrders,
    updateOrder as updateOrderService,
    OrderServiceError,
} from '@/lib/orders'
import type {
    CreateOrderInput,
    UpdateOrderInput,
} from '@/lib/orders'

// ============================================================
// Types — keep Action signatures stable for existing UI
// ============================================================

export interface OrderItemInput {
    productId: string
    quantity: number
    notes?: string | null
    unitId?: string | null
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
    customerId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
}

function toActionError(error: unknown, fallback: string): never {
    if (error instanceof OrderServiceError) {
        throw new Error(error.message)
    }
    throw error instanceof Error ? error : new Error(fallback)
}

// ============================================================
// Read
// ============================================================

export async function getOrders(opts?: GetOrdersOptions) {
    return safeAction(
        async () => {
            await requireAuth()
            const result = await listOrders({
                page: opts?.page,
                limit: opts?.limit,
                status: opts?.status,
                customerId: opts?.customerId,
                search: opts?.search,
                dateFrom: opts?.dateFrom,
                dateTo: opts?.dateTo,
            })
            return {
                data: result.orders,
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            }
        },
        'تعذّر جلب الطلبات'
    )
}

/**
 * Get order stats (counts by status) — استعلام واحد بـ groupBy.
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
            try {
                return await getOrderByIdService(id)
            } catch (error) {
                toActionError(error, 'تعذّر جلب الطلب')
            }
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
            try {
                const input: CreateOrderInput = {
                    customerId: data.customerId,
                    notes: data.notes,
                    deliveryInfo: data.deliveryInfo,
                    items: data.items,
                }
                const { order, reused } = await createOrderService(input)
                return { order, reused }
            } catch (error) {
                toActionError(error, 'تعذّر إنشاء الطلب')
            }
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
            try {
                const input: UpdateOrderInput = {
                    customerId: data.customerId,
                    notes: data.notes,
                    deliveryInfo: data.deliveryInfo,
                    status: data.status as UpdateOrderInput['status'],
                    items: data.items,
                }
                return await updateOrderService(id, input)
            } catch (error) {
                toActionError(error, 'تعذّر تعديل الطلب')
            }
        },
        '/orders',
        'تعذّر تعديل الطلب'
    )
}

export async function updateOrderStatus(id: string, status: string) {
    if (!VALID_ORDER_STATUSES.includes(status as (typeof VALID_ORDER_STATUSES)[number])) {
        return {
            success: false as const,
            error: `حالة غير صالحة: "${status}". القيم المسموحة: ${VALID_ORDER_STATUSES.join(', ')}`,
        }
    }

    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            try {
                return await updateOrderService(id, {
                    status: status as UpdateOrderInput['status'],
                })
            } catch (error) {
                toActionError(error, 'تعذّر تحديث حالة الطلب')
            }
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
            try {
                await deleteOrderService(id)
                return null
            } catch (error) {
                toActionError(error, 'تعذّر حذف الطلب')
            }
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
