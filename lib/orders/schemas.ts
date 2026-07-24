import { z } from 'zod'
import { VALID_ORDER_STATUSES } from '@/lib/order-constants'
import {
    absentToUndefined,
    nullishString,
    nullishUuid,
    optionalIntParam,
    optionalString,
    optionalUuid,
} from '@/lib/zod-optional'

const uuid = z.string().uuid()

/** Sellable Item (SKU) line — Bot HTTP uses itemId */
export const OrderItemInputSchema = z.object({
    itemId: uuid,
    quantity: z.preprocess(
        absentToUndefined,
        z.number().int().min(1).default(1)
    ),
    unitId: nullishUuid,
    notes: nullishString,
    unitPrice: z.preprocess(
        absentToUndefined,
        z.number().nonnegative().optional()
    ),
    currencyId: nullishUuid,
    priceLabelId: nullishUuid,
})

export const CreateOrderSchema = z.object({
    customerId: nullishUuid,
    notes: nullishString,
    deliveryInfo: nullishString,
    items: z.array(OrderItemInputSchema).optional().default([]),
})

export const UpdateOrderSchema = z
    .object({
        status: z.preprocess(
            absentToUndefined,
            z.enum(VALID_ORDER_STATUSES).optional()
        ),
        notes: nullishString,
        deliveryInfo: nullishString,
        customerId: nullishUuid,
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
    quantity: z.preprocess(
        absentToUndefined,
        z.number().int().min(1).optional()
    ),
    unitId: nullishUuid,
    notes: nullishString,
})

export const ListOrdersQuerySchema = z.object({
    customerId: optionalUuid,
    phone: optionalString,
    status: z.preprocess(
        absentToUndefined,
        z.enum(VALID_ORDER_STATUSES).optional()
    ),
    search: optionalString,
    dateFrom: optionalString,
    dateTo: optionalString,
    page: optionalIntParam(1, { min: 1 }),
    limit: optionalIntParam(50, { min: 1, max: 100 }),
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
    pending: z.preprocess((val) => {
        const v = absentToUndefined(val)
        if (v === undefined) return undefined
        if (v === true || v === 'true' || v === '1') return true
        if (v === false || v === 'false' || v === '0') return false
        return v
    }, z.boolean().optional()),
    id: optionalUuid,
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
        customerId: optionalUuid,
        phone: optionalString,
    })
    .refine(data => data.customerId || data.phone, {
        message: 'يجب تمرير customerId أو phone',
    })
