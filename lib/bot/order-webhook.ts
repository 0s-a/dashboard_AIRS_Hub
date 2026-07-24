/**
 * Fire-and-forget webhook when an order status changes.
 * Set BOT_ORDER_WEBHOOK_URL (optional BOT_ORDER_WEBHOOK_SECRET as Bearer).
 * Failures are logged only — never block the order update.
 */
export type OrderStatusWebhookPayload = {
    event: 'order.status_changed'
    orderId: string
    orderNumber?: string | null
    previousStatus: string
    status: string
    customerId: string | null
    at: string
}

export function notifyOrderStatusWebhook(
    payload: OrderStatusWebhookPayload
): void {
    const url = process.env.BOT_ORDER_WEBHOOK_URL?.trim()
    if (!url) return

    const secret = process.env.BOT_ORDER_WEBHOOK_SECRET?.trim()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Nawaat-Bot-Webhook/1.0',
    }
    if (secret) {
        headers.Authorization = `Bearer ${secret}`
    }

    void fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    }).catch(err => {
        console.warn('[Bot order webhook]', err)
    })
}
