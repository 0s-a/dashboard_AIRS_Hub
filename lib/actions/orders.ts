'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

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
// Helpers
// ============================================================

/** Generate next 4-digit order number e.g. "0001" */
async function generateOrderNumber(): Promise<string> {
    const last = await prisma.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
    })
    const next = last ? parseInt(last.orderNumber, 10) + 1 : 1
    return String(next).padStart(4, '0')
}

/**
 * Resolve unit price and currency from ProductPrice.
 * Returns null if no matching ProductPrice found.
 */
async function resolveProductPrice(productId: string, priceLabelId: string) {
    const pp = await prisma.productPrice.findFirst({
        where: { productId, priceLabelId },
        include: { currency: true },
    })
    return pp
}

// ============================================================
// Read
// ============================================================

export async function getOrders() {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
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
        return { success: true, data: orders }
    } catch (error) {
        console.error('Failed to fetch orders:', error)
        return { success: false, error: 'تعذّر جلب الطلبات', data: [] }
    }
}

export async function getOrderById(id: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id },
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
        if (!order) return { success: false, error: 'الطلب غير موجود' }
        return { success: true, data: order }
    } catch (error) {
        console.error('Failed to fetch order:', error)
        return { success: false, error: 'تعذّر جلب الطلب' }
    }
}

// ============================================================
// Create
// ============================================================

export async function createOrder(data: CreateOrderData) {
    try {
        const resolvedItems: {
            productId: string
            priceLabelId: string
            variantId: string | null
            unitPrice: number
            currencyId: string | null
            quantity: number
            notes?: string | null
        }[] = []

        for (const item of data.items) {
            const pp = await resolveProductPrice(item.productId, item.priceLabelId)
            if (!pp) {
                return {
                    success: false,
                    error: `لا توجد تسعيرة مرتبطة بالمنتج المختار`,
                }
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

        const totalAmount = resolvedItems.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity,
            0
        )

        const orderNumber = await generateOrderNumber()

        const order = await prisma.order.create({
            data: {
                orderNumber,
                personId: data.personId ?? null,
                notes: data.notes ?? null,
                totalAmount,
                items: {
                    create: resolvedItems,
                },
            },
        })

        revalidatePath('/orders')
        return { success: true, data: order }
    } catch (error) {
        console.error('Failed to create order:', error)
        return { success: false, error: 'تعذّر إنشاء الطلب' }
    }
}

// ============================================================
// Update
// ============================================================

export async function updateOrder(id: string, data: UpdateOrderData) {
    try {
        let totalAmount: number | undefined
        let itemsUpdate: any = undefined

        if (data.items !== undefined) {
            const resolvedItems: {
                productId: string
                priceLabelId: string
                variantId: string | null
                unitPrice: number
                currencyId: string | null
                quantity: number
                notes?: string | null
            }[] = []

            for (const item of data.items) {
                const pp = await resolveProductPrice(item.productId, item.priceLabelId)
                if (!pp) {
                    return {
                        success: false,
                        error: `لا توجد تسعيرة مرتبطة بالمنتج المختار`,
                    }
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

            totalAmount = resolvedItems.reduce(
                (sum, i) => sum + i.unitPrice * i.quantity,
                0
            )

            itemsUpdate = {
                deleteMany: {},
                create: resolvedItems,
            }
        }

        const order = await prisma.order.update({
            where: { id },
            data: {
                personId: data.personId !== undefined ? data.personId ?? null : undefined,
                notes: data.notes !== undefined ? data.notes ?? null : undefined,
                status: data.status,
                totalAmount,
                ...(itemsUpdate && { items: itemsUpdate }),
            },
        })

        revalidatePath('/orders')
        return { success: true, data: order }
    } catch (error) {
        console.error('Failed to update order:', error)
        return { success: false, error: 'تعذّر تعديل الطلب' }
    }
}

export async function updateOrderStatus(id: string, status: string) {
    try {
        const order = await prisma.order.update({
            where: { id },
            data: { status },
        })
        revalidatePath('/orders')
        return { success: true, data: order }
    } catch (error) {
        console.error('Failed to update order status:', error)
        return { success: false, error: 'تعذّر تحديث حالة الطلب' }
    }
}

// ============================================================
// Delete
// ============================================================

export async function deleteOrder(id: string) {
    try {
        await prisma.order.delete({ where: { id } })
        revalidatePath('/orders')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete order:', error)
        return { success: false, error: 'تعذّر حذف الطلب' }
    }
}

// ============================================================
// Helper: Get available price labels for a product
// ============================================================

export async function getProductPriceLabels(productId: string) {
    try {
        const prices = await prisma.productPrice.findMany({
            where: { productId },
            include: {
                priceLabel: true,
                currency: true,
            },
        })
        return { success: true, data: prices }
    } catch (error) {
        console.error('Failed to fetch product price labels:', error)
        return { success: false, error: 'تعذّر جلب التسعيرات', data: [] }
    }
}

// ============================================================
// Helper: Get variants for a product
// ============================================================

export async function getProductVariants(productId: string) {
    try {
        const variants = await prisma.variant.findMany({
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
        })
        return { success: true, data: variants }
    } catch (error) {
        console.error('Failed to fetch product variants:', error)
        return { success: false, error: 'تعذّر جلب المتغيرات', data: [] }
    }
}
