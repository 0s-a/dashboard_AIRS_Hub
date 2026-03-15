'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation, generateItemNumber, resolveProductPrice } from '@/lib/action-utils'
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
    personId?: string | null
    notes?: string | null
    items: OrderItemInput[]
}

export interface UpdateOrderData {
    personId?: string | null
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
            unitPrice: pp.value,
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

export async function getOrders() {
    return safeAction(
        () => prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: ORDER_INCLUDE,
        }),
        'تعذّر جلب الطلبات'
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
            const orderNumber = await generateItemNumber('order')

            return prisma.order.create({
                data: {
                    orderNumber,
                    personId: data.personId ?? null,
                    notes: data.notes ?? null,
                    totalAmount,
                    items: { create: resolvedItems },
                },
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
            let totalAmount: number | undefined
            let itemsUpdate: any = undefined

            if (data.items !== undefined) {
                const resolvedItems = await resolveItems(data.items)
                totalAmount = calcTotal(resolvedItems)
                itemsUpdate = {
                    deleteMany: {},
                    create: resolvedItems,
                }
            }

            return prisma.order.update({
                where: { id },
                data: {
                    personId: data.personId !== undefined ? data.personId ?? null : undefined,
                    notes: data.notes !== undefined ? data.notes ?? null : undefined,
                    status: data.status,
                    totalAmount,
                    ...(itemsUpdate && { items: itemsUpdate }),
                },
            })
        },
        '/orders',
        'تعذّر تعديل الطلب'
    )
}

export async function updateOrderStatus(id: string, status: string) {
    return safeActionWithRevalidation(
        () => prisma.order.update({ where: { id }, data: { status } }),
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
        () => prisma.productPrice.findMany({
            where: { productId },
            include: { priceLabel: true, currency: true },
        }),
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
