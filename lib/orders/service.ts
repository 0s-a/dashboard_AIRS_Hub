import { prisma } from '@/lib/prisma'
import { generateItemNumber } from '@/lib/action-utils'
import { validateOrderStatus } from '@/lib/order-constants'
import { ORDER_INCLUDE, ORDER_ITEM_INCLUDE } from '@/lib/prisma-includes'
import {
    normalizePhonePatterns,
    validatePhoneInput,
} from '@/lib/api-utils'
import {
    assertOrderDeletable,
    assertOrderMutable,
    assertValidStatusTransition,
} from './guards'
import { OrderServiceError } from './errors'
import { resolveItemSnapshot } from './snapshot'
import type {
    CreateOrderInput,
    ListOrdersInput,
    OrderItemInput,
    PendingOrderInput,
    UpdateOrderInput,
} from './types'
import type { Prisma } from '@prisma/client'

const PENDING_ORDER_INCLUDE = {
    customer: {
        select: {
            id: true,
            name: true,
            priceLabelId: true,
            contacts: { select: { type: true, value: true, isPrimary: true } },
        },
    },
    items: { include: ORDER_ITEM_INCLUDE },
} as const

async function resolveCustomerId(input: {
    customerId?: string
    phone?: string
}): Promise<string | undefined> {
    if (input.customerId) return input.customerId

    if (input.phone) {
        const cleaned = validatePhoneInput(input.phone)
        if (!cleaned) {
            throw new OrderServiceError('رقم الهاتف غير صالح', 400, 'VALIDATION_ERROR')
        }
        const patterns = normalizePhonePatterns(cleaned)
        const customer = await prisma.customer.findFirst({
            where: {
                type: 'customer',
                contacts: { some: { value: { in: patterns } } },
            },
            select: { id: true },
        })
        if (!customer) {
            throw new OrderServiceError('العميل غير موجود بهذا الرقم', 404, 'NOT_FOUND')
        }
        return customer.id
    }

    return undefined
}

async function assertProductsExist(items: OrderItemInput[]) {
    if (items.length === 0) return

    const productIds = [...new Set(items.map(item => item.productId))]
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
    })
    if (products.length !== productIds.length) {
        throw new OrderServiceError('المنتج غير موجود', 404, 'NOT_FOUND')
    }
}

async function buildItemCreateData(
    items: OrderItemInput[],
    customerId?: string | null
) {
    return Promise.all(
        items.map(async item => {
            const snapshot = await resolveItemSnapshot({
                customerId,
                productId: item.productId,
                unitId: item.unitId,
                unitPrice: item.unitPrice,
                currencyId: item.currencyId,
                priceLabelId: item.priceLabelId,
            })

            return {
                productId: item.productId,
                unitId: item.unitId ?? null,
                quantity: item.quantity ?? 1,
                notes: item.notes ?? null,
                unitPrice: snapshot.unitPrice,
                currencyId: snapshot.currencyId,
                priceLabelId: snapshot.priceLabelId,
            }
        })
    )
}

async function getOrderOrThrow(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
    })
    if (!order) {
        throw new OrderServiceError('الطلب غير موجود', 404, 'NOT_FOUND')
    }
    return order
}

export async function createOrder(input: CreateOrderInput) {
    const items = input.items ?? []

    if (input.customerId) {
        const existingPending = await prisma.order.findFirst({
            where: { customerId: input.customerId, status: 'pending' },
            include: ORDER_INCLUDE,
            orderBy: { createdAt: 'desc' },
        })
        if (existingPending) {
            return { order: existingPending, reused: true as const }
        }
    }

    await assertProductsExist(items)

    const order = await prisma.$transaction(async tx => {
        const orderNumber = await generateItemNumber('order')
        const itemData = await buildItemCreateData(items, input.customerId)

        return tx.order.create({
            data: {
                orderNumber,
                customerId: input.customerId ?? null,
                notes: input.notes ?? null,
                deliveryInfo: input.deliveryInfo ?? null,
                items: itemData.length > 0 ? { create: itemData } : undefined,
            },
            include: ORDER_INCLUDE,
        })
    })

    return { order, reused: false as const }
}

export async function listOrders(input: ListOrdersInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.max(1, Math.min(100, input.limit ?? 50))
    const skip = (page - 1) * limit

    const where: Prisma.OrderWhereInput = {}

    const customerId = await resolveCustomerId({
        customerId: input.customerId,
        phone: input.phone,
    })
    if (customerId) where.customerId = customerId

    if (input.status) {
        const valid = validateOrderStatus(input.status)
        if (!valid) {
            throw new OrderServiceError('حالة الطلب غير صالحة', 400, 'VALIDATION_ERROR')
        }
        where.status = valid
    }

    if (input.search) {
        where.orderNumber = { contains: input.search, mode: 'insensitive' }
    }

    if (input.dateFrom || input.dateTo) {
        where.createdAt = {
            ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
            ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        }
    }

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

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getPendingOrder(input: PendingOrderInput) {
    const targetCustomerId = await resolveCustomerId(input)
    if (!targetCustomerId) {
        throw new OrderServiceError(
            'يجب تمرير customerId أو phone',
            400,
            'VALIDATION_ERROR'
        )
    }

    const order = await prisma.order.findFirst({
        where: { customerId: targetCustomerId, status: 'pending' },
        include: PENDING_ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
    })

    if (!order) {
        throw new OrderServiceError('لا يوجد طلب معلّق لهذا العميل', 404, 'NOT_FOUND')
    }

    return order
}

export async function getOrderById(id: string) {
    return getOrderOrThrow(id)
}

export async function updateOrder(id: string, input: UpdateOrderInput) {
    const existing = await prisma.order.findUnique({
        where: { id },
        select: { id: true, status: true, customerId: true },
    })
    if (!existing) {
        throw new OrderServiceError('الطلب غير موجود', 404, 'NOT_FOUND')
    }

    let nextStatus = existing.status
    if (input.status !== undefined) {
        const valid = validateOrderStatus(input.status)
        if (!valid) {
            throw new OrderServiceError('حالة الطلب غير صالحة', 400, 'VALIDATION_ERROR')
        }
        assertValidStatusTransition(existing.status, valid)
        nextStatus = valid
    }

    const hasMetadataUpdate =
        input.notes !== undefined ||
        input.deliveryInfo !== undefined ||
        input.customerId !== undefined

    const hasItemsUpdate = input.items !== undefined

    if (hasMetadataUpdate || hasItemsUpdate) {
        assertOrderMutable(existing.status)
    }

    if (hasItemsUpdate) {
        if (!input.items || input.items.length === 0) {
            throw new OrderServiceError(
                'لا يمكن حفظ طلب بدون منتجات — أضف منتجاً واحداً على الأقل',
                400,
                'VALIDATION_ERROR'
            )
        }
        await assertProductsExist(input.items)
    }

    const snapshotCustomerId =
        input.customerId !== undefined ? input.customerId : existing.customerId

    const itemData = hasItemsUpdate
        ? await buildItemCreateData(input.items!, snapshotCustomerId)
        : null

    return prisma.$transaction(async tx => {
        if (itemData) {
            await tx.orderItem.deleteMany({ where: { orderId: id } })
            await tx.orderItem.createMany({
                data: itemData.map(item => ({ ...item, orderId: id })),
            })
        }

        return tx.order.update({
            where: { id },
            data: {
                ...(input.status !== undefined && { status: nextStatus }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.deliveryInfo !== undefined && { deliveryInfo: input.deliveryInfo }),
                ...(input.customerId !== undefined && { customerId: input.customerId }),
            },
            include: ORDER_INCLUDE,
        })
    })
}

export async function deleteOrder(id: string) {
    const existing = await prisma.order.findUnique({
        where: { id },
        select: { id: true, status: true },
    })
    if (!existing) {
        throw new OrderServiceError('الطلب غير موجود', 404, 'NOT_FOUND')
    }

    assertOrderDeletable(existing.status)

    await prisma.order.delete({ where: { id } })
    return { deleted: true, id }
}

export async function replaceOrderItems(orderId: string, items: OrderItemInput[]) {
    const order = await getOrderOrThrow(orderId)
    assertOrderMutable(order.status)
    await assertProductsExist(items)

    const itemData = await buildItemCreateData(items, order.customerId)

    return prisma.$transaction(async tx => {
        await tx.orderItem.deleteMany({ where: { orderId } })
        await tx.orderItem.createMany({
            data: itemData.map(item => ({ ...item, orderId })),
        })
        return tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: ORDER_INCLUDE,
        })
    })
}

export async function addOrderItem(orderId: string, input: OrderItemInput) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, customerId: true },
    })
    if (!order) {
        throw new OrderServiceError('الطلب غير موجود', 404, 'NOT_FOUND')
    }
    assertOrderMutable(order.status)
    await assertProductsExist([input])

    const existingItem = await prisma.orderItem.findFirst({
        where: {
            orderId,
            productId: input.productId,
            unitId: input.unitId ?? null,
        },
    })

    if (existingItem) {
        const item = await prisma.orderItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + (input.quantity ?? 1) },
            include: ORDER_ITEM_INCLUDE,
        })
        return { item, created: false as const }
    }

    const snapshot = await resolveItemSnapshot({
        customerId: order.customerId,
        productId: input.productId,
        unitId: input.unitId,
        unitPrice: input.unitPrice,
        currencyId: input.currencyId,
        priceLabelId: input.priceLabelId,
    })

    const item = await prisma.orderItem.create({
        data: {
            orderId,
            productId: input.productId,
            unitId: input.unitId ?? null,
            quantity: input.quantity ?? 1,
            notes: input.notes ?? null,
            unitPrice: snapshot.unitPrice,
            currencyId: snapshot.currencyId,
            priceLabelId: snapshot.priceLabelId,
        },
        include: ORDER_ITEM_INCLUDE,
    })
    return { item, created: true as const }
}

export async function updateOrderItem(
    orderId: string,
    itemId: string,
    input: {
        quantity?: number
        unitId?: string | null
        notes?: string | null
    }
) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, customerId: true },
    })
    if (!order) {
        throw new OrderServiceError('الطلب غير موجود', 404, 'NOT_FOUND')
    }
    assertOrderMutable(order.status)

    const existingItem = await prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!existingItem || existingItem.orderId !== orderId) {
        throw new OrderServiceError('البند غير موجود في هذا الطلب', 404, 'NOT_FOUND')
    }

    const unitIdChanging =
        input.unitId !== undefined &&
        (input.unitId ?? null) !== (existingItem.unitId ?? null)

    let snapshotUpdate: {
        unitPrice: number | null
        currencyId: string | null
        priceLabelId: string | null
    } | null = null

    if (unitIdChanging) {
        snapshotUpdate = await resolveItemSnapshot({
            customerId: order.customerId,
            productId: existingItem.productId,
            unitId: input.unitId,
            priceLabelId: existingItem.priceLabelId,
        })
    }

    return prisma.orderItem.update({
        where: { id: itemId },
        data: {
            ...(input.quantity !== undefined && { quantity: input.quantity }),
            ...(input.unitId !== undefined && { unitId: input.unitId }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(snapshotUpdate && {
                unitPrice: snapshotUpdate.unitPrice,
                currencyId: snapshotUpdate.currencyId,
                priceLabelId: snapshotUpdate.priceLabelId,
            }),
        },
        include: ORDER_ITEM_INCLUDE,
    })
}

export async function deleteOrderItem(orderId: string, itemId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
    })
    if (!order) {
        throw new OrderServiceError('الطلب غير موجود', 404, 'NOT_FOUND')
    }
    assertOrderMutable(order.status)

    const existingItem = await prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!existingItem || existingItem.orderId !== orderId) {
        throw new OrderServiceError('البند غير موجود في هذا الطلب', 404, 'NOT_FOUND')
    }

    await prisma.orderItem.delete({ where: { id: itemId } })
    return { deleted: true, id: itemId }
}
