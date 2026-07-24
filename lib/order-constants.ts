// ============================================================
// Order Constants — shared between server actions, API routes, and UI
// No 'use server' — these are plain utilities & constants
// ============================================================

/**
 * Valid order status values — single source of truth.
 * Used for validation in both API and server actions.
 */
export const VALID_ORDER_STATUSES = [
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
] as const

export type OrderStatusValue = typeof VALID_ORDER_STATUSES[number]

/**
 * Validates that a status string is a valid order status.
 * Returns the typed status or null if invalid.
 */
export function validateOrderStatus(status: string): OrderStatusValue | null {
    return VALID_ORDER_STATUSES.includes(status as OrderStatusValue)
        ? (status as OrderStatusValue)
        : null
}

// ============================================================
// Order Status Config — مصدر موحّد لجميع طبقات UI
// يُستخدَم في: order-columns, order-status-updater, order detail page
// ============================================================

export interface OrderStatusConfig {
    value: OrderStatusValue
    label: string
    color: string  // Tailwind classes
}

export const ORDER_STATUS_CONFIG: Record<OrderStatusValue, OrderStatusConfig> = {
    pending:    { value: 'pending',    label: 'معلق',        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800' },
    confirmed:  { value: 'confirmed',  label: 'مؤكد',        color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800' },
    processing: { value: 'processing', label: 'قيد التجهيز', color: 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800' },
    shipped:    { value: 'shipped',    label: 'تم الشحن',    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800' },
    delivered:  { value: 'delivered',  label: 'تم التسليم',  color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' },
    cancelled:  { value: 'cancelled',  label: 'ملغي',        color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800' },
}

/** قائمة مرتبة للاستخدام في UI loops */
export const ORDER_STATUS_LIST = VALID_ORDER_STATUSES.map(v => ORDER_STATUS_CONFIG[v])

/** انتقالات الحالة المسموحة — مصدر موحّد للـ UI وguards */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
}

export function getAllowedStatusTransitions(from: string): OrderStatusValue[] {
    return [...(ALLOWED_STATUS_TRANSITIONS[from as OrderStatusValue] ?? [])]
}
