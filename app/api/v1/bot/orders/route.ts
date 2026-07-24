import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess, botApiError } from '@/lib/api-utils'
import {
    CreateOrderSchema,
    GetOrdersDispatchSchema,
    OrderIdQuerySchema,
    UpdateOrderSchema,
    createOrder,
    listOrders,
    getPendingOrder,
    getOrderById,
    updateOrder,
    deleteOrder,
} from '@/lib/orders'
import { handleOrderServiceError } from '@/lib/orders/handle-error'

export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const parsed = GetOrdersDispatchSchema.safeParse(Object.fromEntries(searchParams))

        if (!parsed.success) {
            return botApiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const { pending, id, ...listFilters } = parsed.data

        if (pending) {
            const order = await getPendingOrder({
                customerId: listFilters.customerId,
                phone: listFilters.phone,
            })
            return apiSuccess(order)
        }

        if (id) {
            const order = await getOrderById(id)
            return apiSuccess(order)
        }

        const result = await listOrders(listFilters)

        return apiSuccess(result.orders, 200, {
            count: result.orders.length,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        })
    } catch (error) {
        return handleOrderServiceError(error)
    }
}

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = CreateOrderSchema.safeParse(body)

        if (!parsed.success) {
            return botApiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const { order, reused } = await createOrder(parsed.data)
        return apiSuccess(order, reused ? 200 : 201)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}

export async function PATCH(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const idParsed = OrderIdQuerySchema.safeParse(Object.fromEntries(searchParams))

        if (!idParsed.success) {
            return botApiError('يجب تمرير id في query parameters', 400, {
                code: 'VALIDATION_ERROR',
                details: idParsed.error.flatten(),
            })
        }

        const body = await req.json().catch(() => ({}))
        const parsed = UpdateOrderSchema.safeParse(body)

        if (!parsed.success) {
            return botApiError('بيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const order = await updateOrder(idParsed.data.id, parsed.data)
        return apiSuccess(order)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}

export async function DELETE(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const idParsed = OrderIdQuerySchema.safeParse(Object.fromEntries(searchParams))

        if (!idParsed.success) {
            return botApiError('يجب تمرير id في query parameters', 400, {
                code: 'VALIDATION_ERROR',
                details: idParsed.error.flatten(),
            })
        }

        const result = await deleteOrder(idParsed.data.id)
        return apiSuccess(result)
    } catch (error) {
        return handleOrderServiceError(error)
    }
}
