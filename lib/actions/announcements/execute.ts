'use server'

/**
 * lib/actions/announcements/execute.ts
 *
 * Server action: executeAnnouncementToQueue
 *
 * Orchestrates the full announcement send pipeline:
 *   1. Validate announcement state
 *   2. Fetch template + product payloads
 *   3. Stream customers in batches → render personalised messages → upsert DB records
 *   4. Publish all records to RabbitMQ in parallel
 */

import { safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAdmin }               from '@/lib/auth-utils'
import { publishBatch, createAnnouncementChannel } from '@/lib/utils/rabbitmq'
import { renderMessage, extractWhatsappNumber } from '@/lib/utils/message-builder'
import { convertUrlsToBase64 } from './base64-helper'
import type { ThrottleConfig, CustomerPayload } from '@/lib/types/announcements'
import type { QueueMessagePayload }   from '@/lib/utils/rabbitmq'
import {
    dbGetAnnouncement,
    dbSetAnnouncementStatus,
    dbGetRenderableTemplate,
    dbGetProductPayloads,
    dbGetCustomerIds,
    dbUpsertMessage,
} from './queries'
import {
    streamCustomers,
} from './queries'
import {
    ANNOUNCEMENTS_PATH,
    BATCH_SIZE,
    ALREADY_PROCESSED_STATUSES,
} from './types'
import type { CustomerFilters, ProductFilters } from '@/lib/types/announcements'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extracts the best WhatsApp-routable number from a contacts list. */


/** Builds the ThrottleConfig from an Announcement record. */
function buildThrottle(ann: {
    delayBetweenSeconds: number
    sendWindowStart:     string | null
    sendWindowEnd:       string | null
}): ThrottleConfig {
    return {
        delayBetweenSeconds: ann.delayBetweenSeconds,
        sendWindowStart:     ann.sendWindowStart,
        sendWindowEnd:       ann.sendWindowEnd,
    }
}

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Full announcement send pipeline.
 *
 * - Resolves audience via streaming (safe for 100k+ customers)
 * - Renders personalised messages using the saved template
 * - Upserts AnnouncementMessage records (idempotent)
 * - Publishes to RabbitMQ with concurrency-50 batching
 */
export async function executeAnnouncementToQueue(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        // ── Guard ──────────────────────────────────────────────────────────────
        const ann = await dbGetAnnouncement(id)
        if (!ann) throw new Error('الإعلان غير موجود')
        if (ALREADY_PROCESSED_STATUSES.includes(ann.status as any)) {
            throw new Error('تم معالجة هذا الإعلان مسبقاً')
        }

        await dbSetAnnouncementStatus(id, 'queueing', { queueingProgress: 0 })

        const customerFilters  = ann.personFilters  as CustomerFilters
        const productFilters = ann.productFilters as ProductFilters

        // ── 1. Resolve customer IDs (lightweight count pass) ────────────────────
        const resolvedCustomerIds = await dbGetCustomerIds(
            customerFilters, customerFilters.manualIds ?? []
        )

        if (resolvedCustomerIds.length === 0) {
            await dbSetAnnouncementStatus(id, 'failed', { queueingProgress: 0 })
            throw new Error('لا يوجد عملاء في الجمهور المحدد')
        }

        // ── 2. Fetch template + products (shared across all customers) ──────────
        const [template, productPayloads] = await Promise.all([
            dbGetRenderableTemplate(ann.templateId),
            dbGetProductPayloads(productFilters, productFilters.manualIds ?? []),
        ])

        const resolvedProductIds = productPayloads.map(p => p.id)
        const throttle           = buildThrottle(ann)
        const totalMessages      = resolvedCustomerIds.length
        const mqMessages: Array<{ payload: QueueMessagePayload; whatsappNumber: string | null }> = []

        // ── 3. Stream customers → render → upsert ───────────────────────────────
        let processed = 0
        for await (const customerChunk of streamCustomers(customerFilters, customerFilters.manualIds ?? [], BATCH_SIZE)) {
            const messageRecords = await Promise.all(
                customerChunk.map(async (customer: CustomerPayload, idx: number) => {
                    const rendered       = renderMessage(template, customer, productPayloads)
                    const whatsappNumber = extractWhatsappNumber(customer)

                    return dbUpsertMessage({
                        announcementId: id,
                        messageIndex:   processed + idx + 1,
                        customerId:       customer.id,
                        customerName:     customer.name,
                        whatsappNumber,
                        productIds:     resolvedProductIds,
                        messageBody:    rendered.messageBody,
                        imageUrls:      rendered.imageUrls,
                    })
                })
            )

            // Build RabbitMQ payloads from the upserted records
            for (let j = 0; j < customerChunk.length; j++) {
                const customer = customerChunk[j]
                const msg    = messageRecords[j]

                mqMessages.push({
                    payload: {
                        messageId:      msg.id,
                        announcementId: id,
                        messageIndex:   msg.messageIndex,
                        totalMessages,
                        retryCount:     0,
                        rendered: {
                            customerName:   customer.name,
                            customerId:     customer.id,
                            messageBody:  msg.messageBody,
                            imageUrls:    convertUrlsToBase64(msg.imageUrls as string[]),
                            templateType: (template.type === 'text_image' && Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0) ? 'text_image' : 'text',
                        },
                        throttle,
                    },
                    whatsappNumber: msg.whatsappNumber,
                })
            }

            processed += customerChunk.length

            // Update progress after each chunk
            const pct = Math.round((processed / totalMessages) * 100)
            await dbSetAnnouncementStatus(id, 'queueing', { queueingProgress: pct })
        }

        // ── 4. Publish all to RabbitMQ ────────────────────────────────────────
        const channel = await createAnnouncementChannel()
        const result  = await publishBatch(channel, mqMessages)
        await channel.close()

        await dbSetAnnouncementStatus(id, 'queued', { queueingProgress: 100 })

        return {
            totalMessages,
            published: result.sent,
            failed:    result.failed,
        }
    }, ANNOUNCEMENTS_PATH, 'تعذّر تنفيذ الإعلان')
}
