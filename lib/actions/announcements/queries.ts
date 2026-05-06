/**
 * lib/actions/announcements/queries.ts
 *
 * All Prisma database queries for the Announcement system — isolated in one
 * place so action files contain zero Prisma calls directly.
 *
 * Naming convention: db<Entity><Verb>  e.g. dbGetAnnouncement, dbUpsertMessage
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
    resolveProducts,
    streamPersons,
    countPersons,
    countProducts,
    buildPersonWhere,
    buildProductWhere,
} from '@/lib/utils/targeting'
import {
    DEFAULT_TEXT_TEMPLATE,
} from '@/lib/utils/message-builder'
import type {
    PersonFilters,
    ProductFilters,
    ProductPayload,
} from '@/lib/types/announcements'
import type { AnnouncementStatus } from './types'
import { SNAPSHOT_SAMPLE_SIZE } from './types'

// ─── Re-export targeting helpers so callers import from one place ─────────────

export { streamPersons, countPersons, countProducts, resolveProducts }
export { buildPersonWhere, buildProductWhere }

// ─── Announcement ─────────────────────────────────────────────────────────────

export async function dbGetAnnouncement(id: string) {
    return prisma.announcement.findUnique({ where: { id } })
}

export async function dbGetAnnouncements() {
    return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function dbCreateAnnouncement(
    data: Prisma.AnnouncementUncheckedCreateInput
) {
    return prisma.announcement.create({ data })
}

export async function dbUpdateAnnouncement(
    id:   string,
    data: Prisma.AnnouncementUncheckedUpdateInput
) {
    return prisma.announcement.update({ where: { id }, data })
}

export async function dbDeleteAnnouncement(id: string) {
    return prisma.announcement.delete({ where: { id } })
}

/** Convenience wrapper for status transitions + optional extra fields. */
export async function dbSetAnnouncementStatus(
    id:     string,
    status: AnnouncementStatus,
    extra?: Omit<Prisma.AnnouncementUpdateInput, 'status'>
) {
    return prisma.announcement.update({
        where: { id },
        data:  { status, ...extra },
    })
}

// ─── Template ─────────────────────────────────────────────────────────────────

/** Fetches the template by id and casts type to the literal union.
 *  Falls back to DEFAULT_TEXT_TEMPLATE when templateId is null. */
export async function dbGetRenderableTemplate(templateId: string | null) {
    if (!templateId) {
        return { ...DEFAULT_TEXT_TEMPLATE, id: 'default' as string }
    }
    const t = await prisma.messageTemplate.findUnique({ where: { id: templateId } })
    if (!t) return { ...DEFAULT_TEXT_TEMPLATE, id: 'default' as string }
    return { ...t, type: t.type as 'text' | 'text_image' }
}

// ─── Products ─────────────────────────────────────────────────────────────────

/** Resolves and returns full ProductPayload[] for a set of IDs.
 *  Uses toProductPayload mapper from targeting.ts — no duplication. */
export async function dbGetProductPayloads(
    filters:   ProductFilters,
    manualIds: string[]
): Promise<ProductPayload[]> {
    return resolveProducts(filters, manualIds)
}

/** Resolves product IDs only — lightweight, used for audience preview. */
export async function dbGetProductIds(
    filters:   ProductFilters,
    manualIds: string[]
): Promise<string[]> {
    const where = buildProductWhere(filters)
    const fromFilter = filters.all || Object.keys(filters).some(
        k => k !== 'all' && (filters as any)[k]
    )
        ? await prisma.product.findMany({ where, select: { id: true } })
        : []
    const fromManual = manualIds.length > 0
        ? await prisma.product.findMany({
            where:  { id: { in: manualIds }, isAvailable: true },
            select: { id: true },
        })
        : []
    return [...new Set([...fromFilter.map(p => p.id), ...fromManual.map(p => p.id)])]
}

/** Snapshot: first N products for preview display. */
export async function dbGetProductSnapshot(ids: string[]) {
    return prisma.product.findMany({
        where:  { id: { in: ids.slice(0, SNAPSHOT_SAMPLE_SIZE) } },
        select: { id: true, name: true, itemNumber: true },
    })
}

// ─── Persons ──────────────────────────────────────────────────────────────────

/** Resolves person IDs only — used for audience preview counts. */
export async function dbGetPersonIds(
    filters:   PersonFilters,
    manualIds: string[]
): Promise<string[]> {
    const where = buildPersonWhere(filters, manualIds)
    const rows  = await prisma.person.findMany({ where, select: { id: true } })
    return rows.map(r => r.id)
}

/** Snapshot: first N persons for preview display. */
export async function dbGetPersonSnapshot(ids: string[]) {
    return prisma.person.findMany({
        where:  { id: { in: ids.slice(0, SNAPSHOT_SAMPLE_SIZE) } },
        select: { id: true, name: true, groupName: true },
    })
}

/** Fetch small person sample with rendering data for dryRun. */
export async function dbGetPersonSample(ids: string[], limit: number) {
    return prisma.person.findMany({
        where:  { id: { in: ids.slice(0, limit) } },
        select: {
            id:          true,
            name:        true,
            groupName:   true,
            groupNumber: true,
            contacts:    { select: { type: true, value: true } },
            priceLabels: { select: { priceLabelId: true } },
        },
    })
}

// ─── AnnouncementMessage ──────────────────────────────────────────────────────

export interface UpsertMessageInput {
    announcementId: string
    personId:       string
    messageIndex:   number
    personName:     string | null
    whatsappNumber: string | null
    productIds:     string[]
    messageBody:    string
    imageUrls:      string[]
}

/** Idempotent upsert — creates if absent, skips if already exists. */
export async function dbUpsertMessage(data: UpsertMessageInput) {
    return prisma.announcementMessage.upsert({
        where: {
            announcementId_personId: {
                announcementId: data.announcementId,
                personId:       data.personId,
            },
        },
        create: {
            announcementId: data.announcementId,
            messageIndex:   data.messageIndex,
            personId:       data.personId,
            personName:     data.personName,
            whatsappNumber: data.whatsappNumber,
            productIds:     data.productIds as any,
            messageBody:    data.messageBody,
            imageUrls:      data.imageUrls as any,
            status:         'pending',
        },
        update: {},  // never overwrite an existing record
    })
}

export async function dbGetFailedMessages(announcementId: string) {
    return prisma.announcementMessage.findMany({
        where: { announcementId, status: 'failed' },
    })
}

export async function dbMarkMessageRetrying(
    id:       string,
    retryCount: number
) {
    return prisma.announcementMessage.update({
        where: { id },
        data:  { status: 'pending', retryCount, errorReason: null },
    })
}

export interface MessagesPageResult {
    messages:   unknown[]
    total:      number
    page:       number
    totalPages: number
}

export async function dbGetMessages(
    announcementId: string,
    page:           number,
    limit:          number,
    statusFilter?:  string
): Promise<MessagesPageResult> {
    const where: Prisma.AnnouncementMessageWhereInput = { announcementId }
    if (statusFilter) where.status = statusFilter

    const [total, messages] = await Promise.all([
        prisma.announcementMessage.count({ where }),
        prisma.announcementMessage.findMany({
            where,
            orderBy: { messageIndex: 'asc' },
            skip:    (page - 1) * limit,
            take:    limit,
            select: {
                id:             true,
                messageIndex:   true,
                personId:       true,
                personName:     true,
                whatsappNumber: true,
                status:         true,
                errorReason:    true,
                retryCount:     true,
                sentAt:         true,
                queuedAt:       true,
                messageBody:    true,
                imageUrls:      true,
                providerId:     true,
            },
        }),
    ])

    return { messages, total, page, totalPages: Math.ceil(total / limit) }
}

export async function dbGetMessageCounts(announcementId: string) {
    const [total, sent, failed, pending] = await Promise.all([
        prisma.announcementMessage.count({ where: { announcementId } }),
        prisma.announcementMessage.count({ where: { announcementId, status: 'sent' } }),
        prisma.announcementMessage.count({ where: { announcementId, status: 'failed' } }),
        prisma.announcementMessage.count({ where: { announcementId, status: 'pending' } }),
    ])
    return { total, sent, failed, pending }
}

// ─── Form Data (Announcement Sheet) ──────────────────────────────────────────

/** All reference data needed to populate the announcement creation form. */
export async function dbGetAnnouncementFormData() {
    const [persons, personTypes, rawProducts, categories, rawTags] =
        await Promise.all([
            prisma.person.findMany({
                where:   { isActive: true },
                select:  { id: true, name: true, groupName: true },
                orderBy: { name: 'asc' },
            }),
            prisma.personType.findMany({
                select:  { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            prisma.product.findMany({
                where:   { isAvailable: true },
                select: {
                    id: true, name: true, itemNumber: true, categoryId: true,
                    productImages: {
                        select:  { mediaImage: { select: { url: true } } },
                        orderBy: { order: 'asc' },
                        take:    1,
                    },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.category.findMany({
                select:  { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            prisma.person.findMany({
                where:  { isActive: true, NOT: { tags: { equals: [] } } },
                select: { tags: true },
            }),
        ])

    const personTags: string[] = [
        ...new Set(rawTags.flatMap(p => (p.tags as string[]) ?? []))
    ].sort()

    const products = rawProducts.map(p => ({
        id:         p.id,
        name:       p.name,
        itemNumber: p.itemNumber,
        categoryId: p.categoryId,
        mainImage:  (p as any).productImages?.[0]?.mediaImage?.url ?? null,
    }))

    return { persons, personTypes, products, categories, personTags }
}
