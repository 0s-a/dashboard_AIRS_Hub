import {
    ALLOWED_STATUS_TRANSITIONS,
    type OrderStatusValue,
} from '@/lib/order-constants'
import { OrderServiceError } from './errors'

export function assertOrderMutable(status: OrderStatusValue | string): void {
    if (status !== 'pending') {
        throw new OrderServiceError(
            'لا يمكن تعديل طلب غير معلّق',
            409,
            'ORDER_NOT_MUTABLE'
        )
    }
}

export function assertValidStatusTransition(
    from: OrderStatusValue | string,
    to: OrderStatusValue | string
): void {
    if (from === to) return

    const allowed = ALLOWED_STATUS_TRANSITIONS[from as OrderStatusValue]
    if (!allowed || !allowed.includes(to as OrderStatusValue)) {
        throw new OrderServiceError(
            `لا يمكن الانتقال من "${from}" إلى "${to}"`,
            409,
            'INVALID_STATUS_TRANSITION',
            { from, to, allowed: allowed ?? [] }
        )
    }
}

export function assertOrderDeletable(status: OrderStatusValue | string): void {
    if (status !== 'pending' && status !== 'cancelled') {
        throw new OrderServiceError(
            'يمكن حذف الطلبات المعلّقة أو الملغاة فقط',
            409,
            'ORDER_NOT_DELETABLE'
        )
    }
}
