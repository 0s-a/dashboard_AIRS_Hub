/**
 * lib/utils/rabbitmq.ts
 *
 * RabbitMQ connection manager for the Per-Person announcement system.
 *
 * Architecture:
 *   Backend is the Source of Truth — each person gets an AnnouncementMessage
 *   record created BEFORE publishing to RabbitMQ. The messageId links:
 *     DB (AnnouncementMessage) ↔ RabbitMQ payload ↔ n8n callback
 *
 *   publishBatch() sends up to `concurrency` messages in parallel (with broker
 *   ACK per message), replacing the old sequential await-per-message loop.
 */

import amqp from 'amqplib'
import type { ThrottleConfig }  from '@/lib/types/announcements'
import type { RenderedMessage } from '@/lib/types/announcements'

// ─── Queue / Exchange Constants ───────────────────────────────────────────────

const MAIN_QUEUE = process.env.RABBITMQ_QUEUE_NAME ?? 'announcement.messages'

export const QUEUES = {
    MESSAGES: MAIN_QUEUE,
    DLQ:      `${MAIN_QUEUE}.dlq`,
} as const

export const EXCHANGES = {
    DLX: 'announcements.dlx',
} as const

const _queueSuffix = MAIN_QUEUE.split('.').pop() ?? 'messages'
const _singular    = _queueSuffix.replace(/(ch|sh|x|z|ss)es$/, '$1').replace(/s$/, '')
const _failedKey   = _singular + '.failed'

export const ROUTING_KEYS = {
    FAILED: _failedKey,
} as const

// ─── Queue Message Payload ────────────────────────────────────────────────────
//
// ✅ What's in the JSON body:
//   - messageId      → UUID of AnnouncementMessage record (DB ↔ MQ ↔ n8n link)
//   - Tracking IDs   → announcementId, messageIndex, totalMessages, retryCount
//   - rendered       → final message content + imageUrls (n8n uses this to send)
//   - throttle       → rate-limit config that n8n reads
//
// ✅ What's in AMQP headers (routing metadata):
//   - whatsappNumber → n8n routes the message to this number
//   - messageId, personId, announcementId  → for idempotency / tracking
//   - throttle fields → n8n rate limiter reads these from headers

export interface QueueMessagePayload {
    messageId:      string    // ← UUID from AnnouncementMessage.id (Source of Truth link)
    announcementId: string
    messageIndex:   number    // 1-based position of this person
    totalMessages:  number    // Total persons in this campaign
    retryCount:     number    // 0 on first attempt; incremented on retry

    rendered:  RenderedMessage   // Ready-to-send content (no raw person/product data)
    throttle:  ThrottleConfig
}

// ─── Singleton ChannelModel ───────────────────────────────────────────────────

let _model: amqp.ChannelModel | null = null

async function getModel(): Promise<amqp.ChannelModel> {
    if (_model !== null) return _model

    const url = process.env.RABBITMQ_URL
    if (!url) throw new Error('RABBITMQ_URL غير محدد في .env')

    const model = await amqp.connect(url)

    model.on('error', (err: Error) => {
        console.error('[RabbitMQ] Connection error:', err.message)
        _model = null
    })
    model.on('close', () => {
        console.warn('[RabbitMQ] Connection closed — will reconnect on next use')
        _model = null
    })

    _model = model
    return model
}

// ─── Channel Factory ──────────────────────────────────────────────────────────

export async function createAnnouncementChannel(): Promise<amqp.ConfirmChannel> {
    const model   = await getModel()
    const channel = await model.createConfirmChannel()

    await channel.assertExchange(EXCHANGES.DLX, 'direct', { durable: true })
    await channel.assertQueue(QUEUES.DLQ, { durable: true })
    await channel.bindQueue(QUEUES.DLQ, EXCHANGES.DLX, ROUTING_KEYS.FAILED)

    await channel.assertQueue(QUEUES.MESSAGES, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange':    EXCHANGES.DLX,
            'x-dead-letter-routing-key': ROUTING_KEYS.FAILED,
            'x-message-ttl':             86_400_000,
        },
    })

    return channel
}

// ─── Publish a single person's message ───────────────────────────────────────
//
// whatsappNumber comes from the caller (extracted via extractWhatsappNumber())
// and is placed ONLY in AMQP headers — not in the JSON body.

export async function publishMessage(
    channel:         amqp.ConfirmChannel,
    payload:         QueueMessagePayload,
    whatsappNumber:  string | null        // routed via headers, NOT in body
): Promise<void> {
    const content = Buffer.from(JSON.stringify(payload))

    return new Promise((resolve, reject) => {
        const ok = channel.sendToQueue(
            QUEUES.MESSAGES,
            content,
            {
                persistent:  true,
                contentType: 'application/json',
                // Unique per message+attempt — enables n8n idempotency
                messageId: `${payload.messageId}:retry${payload.retryCount}`,
                timestamp:  Math.floor(Date.now() / 1000),
                headers: {
                    // ── Routing ───────────────────────────────────────────────
                    whatsappNumber:      whatsappNumber ?? '',
                    personId:            payload.rendered.personId,
                    groupNumber:         payload.rendered.groupNumber ?? '',
                    // ── Source of Truth Link ──────────────────────────────────
                    messageId:           payload.messageId,      // ← n8n sends this in callback
                    // ── Tracking ──────────────────────────────────────────────
                    announcementId:      payload.announcementId,
                    messageIndex:        payload.messageIndex,
                    totalMessages:       payload.totalMessages,
                    retryCount:          payload.retryCount,
                    // ── Throttle — n8n Rate Limiter reads these ───────────────
                    delayBetweenSeconds: payload.throttle.delayBetweenSeconds,
                    sendWindowStart:     payload.throttle.sendWindowStart ?? '',
                    sendWindowEnd:       payload.throttle.sendWindowEnd   ?? '',
                },
            },
            (err) => (err ? reject(err) : resolve())
        )

        if (!ok) {
            channel.once('drain', () => resolve())
        }
    })
}

// ─── publishBatch — Parallel send with concurrency limiter ───────────────────
/**
 * Sends a batch of messages in parallel — up to `concurrency` in-flight at once.
 * Each message waits for its own broker ACK before the slot is freed.
 *
 * Why: Sequential publishMessage() ~20ms per ACK × 1000 msgs = 20s.
 *      With concurrency=50 → ~2s for the same 1000 messages.
 *
 * @param channel      ConfirmChannel created by createAnnouncementChannel()
 * @param messages     Array of { payload, whatsappNumber } to publish
 * @param concurrency  Max parallel in-flight publishes (default: 50)
 */
export async function publishBatch(
    channel:     amqp.ConfirmChannel,
    messages:    Array<{ payload: QueueMessagePayload; whatsappNumber: string | null }>,
    concurrency  = 50
): Promise<{ sent: number; failed: number }> {
    let sent = 0, failed = 0
    const queue = [...messages]

    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift()
            if (!item) break
            try {
                await publishMessage(channel, item.payload, item.whatsappNumber)
                sent++
            } catch (err) {
                console.error('[RabbitMQ] publishBatch item failed:', err)
                failed++
            }
        }
    }

    const workers = Math.min(concurrency, messages.length)
    await Promise.all(Array.from({ length: workers }, worker))
    return { sent, failed }
}

// ─── Queue Health Check ───────────────────────────────────────────────────────

export async function getQueueDepths(): Promise<{
    messages: number
    dlq:      number
}> {
    const model   = await getModel()
    const channel = await model.createChannel()
    const [messages, dlq] = await Promise.all([
        channel.checkQueue(QUEUES.MESSAGES).catch(() => ({ messageCount: 0 })),
        channel.checkQueue(QUEUES.DLQ).catch(() => ({ messageCount: 0 })),
    ])
    await channel.close()
    return {
        messages: messages.messageCount,
        dlq:      dlq.messageCount,
    }
}
