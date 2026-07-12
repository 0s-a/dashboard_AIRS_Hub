import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess, apiError } from '@/lib/api-utils'
import {
    AddOrderItemSchema,
    ReplaceOrderItemsSchema,
    UpdateOrderItemSchema,
    OrderItemQuerySchema,
    OrderItemIdQuerySchema,
    addOrderItem,
    replaceOrderItems,
    updateOrderItem,
    deleteOrderItem,
} from '@/lib/orders'
import { handleOrderServiceError } from '@/lib/orders/handle-error'

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const queryParsed = OrderItemQuerySchema.safeParse(Object.fromEntries(searchParams))

        if (!queryParsed.success) {
            return apiError('يجب تمرير orderId في query parameters', 400, {
                code: 'VALIDATION_ERROR',
                details: queryParsed.error.flatten(),
            })
        }

        const body = await req.json().catch(() => ({}))
        const parsed = AddOrderItemSchema.safeParse(body)

        if (!parsed.success) {
            return apiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const { item, created } = await addOrderItem(queryParsed.data.orderId, parsed.data)
        return apiSuccess(item, created ? 201 : 200)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}

export async function PUT(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const queryParsed = OrderItemQuerySchema.safeParse(Object.fromEntries(searchParams))

        if (!queryParsed.success) {
            return apiError('يجب تمرير orderId في query parameters', 400, {
                code: 'VALIDATION_ERROR',
                details: queryParsed.error.flatten(),
            })
        }

        const body = await req.json().catch(() => ({}))
        const parsed = ReplaceOrderItemsSchema.safeParse(body)

        if (!parsed.success) {
            return apiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const order = await replaceOrderItems(queryParsed.data.orderId, parsed.data.items)
        return apiSuccess(order)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}

export async function PATCH(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const queryParsed = OrderItemIdQuerySchema.safeParse(Object.fromEntries(searchParams))

        if (!queryParsed.success) {
            return apiError('يجب تمرير orderId و itemId في query parameters', 400, {
                code: 'VALIDATION_ERROR',
                details: queryParsed.error.flatten(),
            })
        }

        const body = await req.json().catch(() => ({}))
        const parsed = UpdateOrderItemSchema.safeParse(body)

        if (!parsed.success) {
            return apiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const item = await updateOrderItem(
            queryParsed.data.orderId,
            queryParsed.data.itemId,
            parsed.data
        )
        return apiSuccess(item)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}

export async function DELETE(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const queryParsed = OrderItemIdQuerySchema.safeParse(Object.fromEntries(searchParams))

        if (!queryParsed.success) {
            return apiError('يجب تمرير orderId و itemId في query parameters', 400, {
                code: 'VALIDATION_ERROR',
                details: queryParsed.error.flatten(),
            })
        }

        const result = await deleteOrderItem(
            queryParsed.data.orderId,
            queryParsed.data.itemId
        )
        return apiSuccess(result)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}
