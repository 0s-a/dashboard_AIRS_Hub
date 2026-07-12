import { z } from 'zod'
import { VALID_ORDER_STATUSES } from '@/lib/order-constants'

const uuid = z.string().uuid()

export const OrderItemInputSchema = z.object({
    productId: uuid,
    quantity: z.number().int().min(1).default(1),
    skuId: uuid.optional().nullable(),
    unitId: uuid.optional().nullable(),
    notes: z.string().optional().nullable(),
    unitPrice: z.number().nonnegative().optional().nullable(),
    currencyId: uuid.optional().nullable(),
    priceLabelId: uuid.optional().nullable(),
})

export const CreateOrderSchema = z.object({
    customerId: uuid.optional().nullable(),
    notes: z.string().optional().nullable(),
    deliveryInfo: z.string().optional().nullable(),
    items: z.array(OrderItemInputSchema).optional().default([]),
})

export const UpdateOrderSchema = z
    .object({
        status: z.enum(VALID_ORDER_STATUSES).optional(),
        notes: z.string().optional().nullable(),
        deliveryInfo: z.string().optional().nullable(),
        customerId: uuid.optional().nullable(),
    })
    .refine(
        data =>
            data.status !== undefined ||
            data.notes !== undefined ||
            data.deliveryInfo !== undefined ||
            data.customerId !== undefined,
        { message: 'يجب تمرير حقل واحد على الأقل للتحديث' }
    )

export const ReplaceOrderItemsSchema = z.object({
    items: z.array(OrderItemInputSchema).min(1, 'يجب أن يحتوي الطلب على منتج واحد على الأقل'),
})

export const AddOrderItemSchema = OrderItemInputSchema

export const UpdateOrderItemSchema = z.object({
    quantity: z.number().int().min(1).optional(),
    skuId: uuid.nullable().optional(),
    unitId: uuid.nullable().optional(),
    notes: z.string().nullable().optional(),
})

export const ListOrdersQuerySchema = z.object({
    customerId: uuid.optional(),
    phone: z.string().optional(),
    status: z.enum(VALID_ORDER_STATUSES).optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const OrderIdQuerySchema = z.object({
    id: uuid,
})

export const OrderItemQuerySchema = z.object({
    orderId: uuid,
})

export const OrderItemIdQuerySchema = z.object({
    orderId: uuid,
    itemId: uuid,
})

export const GetOrdersDispatchSchema = ListOrdersQuerySchema.extend({
    pending: z.coerce.boolean().optional(),
    id: uuid.optional(),
})
    .refine(data => !(data.pending && data.id), {
        message: 'لا يمكن استخدام pending مع id معاً',
    })
    .refine(
        data => !data.pending || data.customerId || data.phone,
        { message: 'يجب تمرير customerId أو phone عند pending=true' }
    )

/** @deprecated use GetOrdersDispatchSchema with pending=true */
export const PendingOrderQuerySchema = z
    .object({
        customerId: uuid.optional(),
        phone: z.string().optional(),
    })
    .refine(data => data.customerId || data.phone, {
        message: 'يجب تمرير customerId أو phone',
    })
