'use server'

/**
 * lib/actions/announcements/announce.ts
 *
 * Server actions: CRUD, lifecycle, preview, and retry for announcements.
 *
 * Each function has a single clear responsibility.
 * All Prisma calls are delegated to queries.ts.
 */

import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { getCurrentUser }   from '@/lib/actions/auth'
import { requireAdmin }     from '@/lib/auth-utils'
import { publishBatch, createAnnouncementChannel } from '@/lib/utils/rabbitmq'
import { renderMessage }    from '@/lib/utils/message-builder'
import { convertUrlsToBase64 } from './base64-helper'
import type { ThrottleConfig, CustomerFilters, ProductFilters } from '@/lib/types/announcements'
import type { QueueMessagePayload } from '@/lib/utils/rabbitmq'
import {
    dbGetAnnouncement,
    dbGetAnnouncements,
    dbCreateAnnouncement,
    dbUpdateAnnouncement,
    dbDeleteAnnouncement,
    dbSetAnnouncementStatus,
    dbGetRenderableTemplate,
    dbGetProductPayloads,
    dbGetCustomerIds,
    dbGetProductIds,
    dbGetCustomerSnapshot,
    dbGetProductSnapshot,
    dbGetCustomerSample,
    dbGetFailedMessages,
    dbMarkMessageRetrying,
    dbGetMessages,
    dbGetMessageCounts,
    dbGetAnnouncementFormData,
    countCustomers,
    countProducts,
} from './queries'
import {
    ANNOUNCEMENTS_PATH,
    DEFAULT_SAMPLE_SIZE,
    DEFAULT_PAGE_LIMIT,
} from './types'
import type { AnnouncementInput } from './types'



// ─── Helpers ──────────────────────────────────────────────────────────────────



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

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Returns all announcements ordered by creation date (newest first). */
export async function getAnnouncements() {
    return safeAction(
        () => dbGetAnnouncements(),
        'تعذّر جلب الإعلانات'
    )
}

/** Returns a single announcement by ID. */
export async function getAnnouncement(id: string) {
    return safeAction(
        () => dbGetAnnouncement(id),
        'تعذّر جلب الإعلان'
    )
}

// ─── Create ───────────────────────────────────────────────────────────────────

/** Creates a new announcement draft. */
export async function createAnnouncement(data: AnnouncementInput) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const userRes = await getCurrentUser()
        const userId  = userRes.success ? (userRes.data as any)?.userId : null

        return dbCreateAnnouncement({
            title:               data.title.trim(),
            description:         data.description?.trim() || null,
            scheduledAt:         new Date(data.scheduledAt),
            personFilters:       (data.customerFilters  ?? { all: true }) as any,
            productFilters:      (data.productFilters ?? { all: true }) as any,
            templateId:          data.templateId ?? null,
            delayBetweenSeconds: data.delayBetweenSeconds ?? 0,
            sendWindowStart:     data.sendWindowStart ?? null,
            sendWindowEnd:       data.sendWindowEnd   ?? null,
            createdBy:           userId,
        })
    }, ANNOUNCEMENTS_PATH, 'تعذّر إنشاء الإعلان')
}

// ─── Update ───────────────────────────────────────────────────────────────────

/** Updates editable fields on a draft announcement. */
export async function updateAnnouncement(id: string, data: Partial<AnnouncementInput>) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        const patch: Record<string, unknown> = {}
        if (data.title                !== undefined) patch.title               = data.title.trim()
        if (data.description          !== undefined) patch.description          = data.description?.trim() || null
        if (data.scheduledAt          !== undefined) patch.scheduledAt          = new Date(data.scheduledAt)
        if (data.customerFilters        !== undefined) patch.personFilters        = data.customerFilters
        if (data.productFilters       !== undefined) patch.productFilters       = data.productFilters
        if (data.templateId           !== undefined) patch.templateId           = data.templateId
        if (data.delayBetweenSeconds  !== undefined) patch.delayBetweenSeconds  = data.delayBetweenSeconds
        if (data.sendWindowStart      !== undefined) patch.sendWindowStart      = data.sendWindowStart
        if (data.sendWindowEnd        !== undefined) patch.sendWindowEnd        = data.sendWindowEnd

        return dbUpdateAnnouncement(id, patch)
    }, ANNOUNCEMENTS_PATH, 'تعذّر تحديث الإعلان')
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/** Deletes an announcement. Sent announcements cannot be deleted. */
export async function deleteAnnouncement(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const ann = await dbGetAnnouncement(id)
        if (ann?.status === 'sent') {
            throw new Error('لا يمكن حذف إعلان تم إرساله بالفعل')
        }
        await dbDeleteAnnouncement(id)
        return null
    }, ANNOUNCEMENTS_PATH, 'تعذّر حذف الإعلان')
}

// ─── Clone ────────────────────────────────────────────────────────────────────

/** Duplicates an announcement as a new pending draft. */
export async function cloneAnnouncement(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const ann = await dbGetAnnouncement(id)
        if (!ann) throw new Error('الإعلان غير موجود')

        return dbCreateAnnouncement({
            title:               `نسخة - ${ann.title}`,
            description:         ann.description,
            scheduledAt:         new Date(),
            personFilters:       ann.personFilters  as any,
            productFilters:      ann.productFilters as any,
            templateId:          ann.templateId,
            delayBetweenSeconds: ann.delayBetweenSeconds,
            sendWindowStart:     ann.sendWindowStart,
            sendWindowEnd:       ann.sendWindowEnd,
            createdBy:           ann.createdBy,
        })
    }, ANNOUNCEMENTS_PATH, 'تعذّر نسخ الإعلان')
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/** Cancels a pending or queued announcement. */
export async function cancelAnnouncement(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        await dbSetAnnouncementStatus(id, 'cancelled')
        return null
    }, ANNOUNCEMENTS_PATH, 'تعذّر إلغاء الإعلان')
}

// ─── Audience Preview ─────────────────────────────────────────────────────────

/** Returns estimated customer + product counts for the given filters. */
export async function previewAudience(
    customerFilters:  CustomerFilters,
    productFilters: ProductFilters,
) {
    return safeAction(async () => {
        const [customerCount, productCount] = await Promise.all([
            countCustomers(customerFilters, customerFilters.manualIds ?? []),
            countProducts(productFilters, productFilters.manualIds ?? []),
        ])
        return { customerCount, productCount }
    }, 'تعذّر حساب الجمهور')
}

/** Returns a sample of customers and products for the saved announcement. */
export async function getAudienceSnapshot(id: string) {
    return safeAction(async () => {
        const ann = await dbGetAnnouncement(id)
        if (!ann) throw new Error('الإعلان غير موجود')

        const customerFilters  = ann.personFilters  as CustomerFilters
        const productFilters = ann.productFilters as ProductFilters

        const [customerIds, productIds] = await Promise.all([
            dbGetCustomerIds(customerFilters, customerFilters.manualIds ?? []),
            dbGetProductIds(productFilters, productFilters.manualIds ?? []),
        ])

        const [sampleCustomers, sampleProducts] = await Promise.all([
            dbGetCustomerSnapshot(customerIds),
            dbGetProductSnapshot(productIds),
        ])

        return {
            customerCount:    customerIds.length,
            productCount:   productIds.length,
            sampleCustomers,
            sampleProducts,
        }
    }, 'تعذّر جلب لقطة الجمهور')
}

// ─── Dry Run ──────────────────────────────────────────────────────────────────

/**
 * Renders sample messages using the announcement's actual template
 * without creating DB records or publishing to the queue.
 */
export async function dryRunAnnouncement(id: string, sampleSize = DEFAULT_SAMPLE_SIZE) {
    return safeAction(async () => {
        const ann = await dbGetAnnouncement(id)
        if (!ann) throw new Error('الإعلان غير موجود')

        const customerFilters  = ann.personFilters  as CustomerFilters
        const productFilters = ann.productFilters as ProductFilters

        const [customerIds, productPayloads, template] = await Promise.all([
            dbGetCustomerIds(customerFilters, customerFilters.manualIds ?? []),
            dbGetProductPayloads(productFilters, productFilters.manualIds ?? []),
            dbGetRenderableTemplate(ann.templateId),
        ])

        const sampleCustomers = await dbGetCustomerSample(customerIds, sampleSize)

        // Render actual messages — same engine as the real send
        const renderedMessages = sampleCustomers.map(customer => {
            const customerPayload = {
                id:            customer.id,
                name:          customer.name,
                priceLabelIds: customer.priceLabelId ? [customer.priceLabelId] : [],
                contacts:      customer.contacts,
            }
            const rendered = renderMessage(template, customerPayload, productPayloads)
            return {
                customerName:  customer.name,
                messageBody: rendered.messageBody,
                imageUrls:   rendered.imageUrls,
                templateType: template.type,
            }
        })

        return {
            totalCustomers:  customerIds.length,
            totalProducts: productPayloads.length,
            sampleCustomers: sampleCustomers.map(p => ({ id: p.id, name: p.name })),
            renderedMessages,
        }
    }, 'تعذّر تنفيذ المعاينة')
}

// ─── Retry Failed Messages ────────────────────────────────────────────────────

/**
 * Re-publishes all failed messages for an announcement to RabbitMQ.
 * Uses publishBatch for parallel processing — not a sequential loop.
 */
export async function retryFailedMessages(announcementId: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        const [failedMsgs, ann] = await Promise.all([
            dbGetFailedMessages(announcementId),
            dbGetAnnouncement(announcementId),
        ])

        if (failedMsgs.length === 0) throw new Error('لا توجد رسائل فاشلة')
        if (!ann)                    throw new Error('الإعلان غير موجود')

        const throttle = buildThrottle(ann)

        // Mark all as pending before publishing
        await Promise.all(
            failedMsgs.map(msg =>
                dbMarkMessageRetrying(msg.id, msg.retryCount + 1)
            )
        )

        // Build payloads and publish as a single parallel batch
        const mqMessages: Array<{ payload: QueueMessagePayload; whatsappNumber: string | null }> =
            failedMsgs.map(msg => ({
                payload: {
                    messageId:      msg.id,
                    announcementId,
                    messageIndex:   msg.messageIndex,
                    totalMessages:  failedMsgs.length,
                    retryCount:     msg.retryCount + 1,
                    rendered: {
                        customerName:   msg.customerName,
                        customerId:     msg.customerId,
                        messageBody:  msg.messageBody,
                        imageUrls:    convertUrlsToBase64(msg.imageUrls as string[]),
                        templateType: (Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0) ? 'text_image' : 'text',
                    },
                    throttle,
                },
                whatsappNumber: msg.whatsappNumber,
            }))

        const channel = await createAnnouncementChannel()
        const result  = await publishBatch(channel, mqMessages)
        await channel.close()

        await dbSetAnnouncementStatus(announcementId, 'queued')

        return { retriedCount: result.sent, failed: result.failed }
    }, ANNOUNCEMENTS_PATH, 'تعذّر إعادة المحاولة')
}

// ─── Progress & Messages ──────────────────────────────────────────────────────

/** Returns delivery progress computed from AnnouncementMessage counts. */
export async function getAnnouncementProgress(id: string) {
    return safeAction(async () => {
        const [ann, counts] = await Promise.all([
            dbGetAnnouncement(id),
            dbGetMessageCounts(id),
        ])
        if (!ann) throw new Error('الإعلان غير موجود')

        return {
            status:           ann.status,
            queueingProgress: ann.queueingProgress,
            sentAt:           ann.sentAt,
            totalMessages:    counts.total,
            successCount:     counts.sent,
            failCount:        counts.failed,
            pendingCount:     counts.pending,
        }
    }, 'تعذّر جلب التقدم')
}

/** Returns a paginated list of AnnouncementMessage records for the logs page. */
export async function getAnnouncementMessages(
    announcementId: string,
    page           = 1,
    limit          = DEFAULT_PAGE_LIMIT,
    statusFilter?:   string,
) {
    return safeAction(
        () => dbGetMessages(announcementId, page, limit, statusFilter),
        'تعذّر جلب سجلات الرسائل'
    )
}

// ─── Form Data ────────────────────────────────────────────────────────────────

/** Returns all reference data needed to populate the announcement form. */
export async function getAnnouncementSheetData() {
    return safeAction(
        () => dbGetAnnouncementFormData(),
        'تعذّر جلب بيانات النموذج'
    )
}
