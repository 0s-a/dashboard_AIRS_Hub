import type { OrderStatusValue } from '@/lib/order-constants'

export interface OrderItemInput {
    productId: string
    quantity?: number
    unitId?: string | null
    notes?: string | null
    unitPrice?: number | null
    currencyId?: string | null
    priceLabelId?: string | null
}

export interface CreateOrderInput {
    customerId?: string | null
    notes?: string | null
    deliveryInfo?: string | null
    items?: OrderItemInput[]
}

export interface UpdateOrderInput {
    status?: OrderStatusValue
    notes?: string | null
    deliveryInfo?: string | null
    customerId?: string | null
    items?: OrderItemInput[]
}

export interface ListOrdersInput {
    customerId?: string
    phone?: string
    status?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
}

export interface PendingOrderInput {
    customerId?: string
    phone?: string
}
