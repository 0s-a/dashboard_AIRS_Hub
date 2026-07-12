import type { OrderStatusValue } from '@/lib/order-constants'
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
