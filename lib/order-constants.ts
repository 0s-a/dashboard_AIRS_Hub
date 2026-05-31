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
