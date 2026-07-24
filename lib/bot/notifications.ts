import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
    canonicalizePhone,
    normalizePhonePatterns,
} from '@/lib/phone-utils'
import { BotServiceError } from './errors'
import { resolveItemRef } from './resolve-item'
import { optionalString } from '@/lib/zod-optional'

const NotificationType = z.enum(['out_of_stock', 'not_found'])

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

export const CreateNotificationSchema = z
    .object({
        type: NotificationType,
        q: optionalString,
        searchQuery: optionalString,
        phone: optionalString,
        phoneNumber: optionalString,
        customerId: optionalString,
        itemId: optionalString,
        itemNumber: optionalString,
    })
    .transform(data => {
        const q = (data.q ?? data.searchQuery)?.trim() ?? ''
        const phoneRaw = data.phone ?? data.phoneNumber
        const phone =
            phoneRaw != null && String(phoneRaw).trim() !== ''
                ? String(phoneRaw).trim()
                : null
        return {
            type: data.type,
            q,
            phone,
            customerId: data.customerId?.trim() || null,
            itemId: data.itemId?.trim() || null,
            itemNumber: data.itemNumber?.trim() || null,
        }
    })
    .pipe(
        z
            .object({
                type: NotificationType,
                q: z.string().min(1, 'q is required'),
                phone: z.string().nullable(),
                customerId: z.string().nullable(),
                itemId: z.string().nullable(),
                itemNumber: z.string().nullable(),
            })
            .refine(
                data =>
                    data.type !== 'out_of_stock' ||
                    !!(data.itemId || data.itemNumber),
                {
                    message:
                        'يجب تمرير itemId أو itemNumber عند type=out_of_stock',
                    path: ['itemId'],
                }
            )
    )

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>

export type CreateNotificationResult = {
    id: string
    type: string
    created: boolean
}

async function resolveCustomerId(
    customerId: string | null,
    phoneCanonical: string | null
): Promise<string | null> {
    if (customerId) {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true },
        })
        if (!customer) {
            throw new BotServiceError('العميل غير موجود', 404, 'NOT_FOUND')
        }
        return customer.id
    }

    if (!phoneCanonical) return null

    const patterns = normalizePhonePatterns(phoneCanonical)
    const customer = await prisma.customer.findFirst({
        where: {
            type: 'customer',
            contacts: {
                some: {
                    value: { in: patterns },
                    type: { in: ['phone', 'whatsapp'] },
                },
            },
        },
        select: { id: true },
    })
    return customer?.id ?? null
}

export async function createNotification(
    input: CreateNotificationInput
): Promise<CreateNotificationResult> {
    const { type, q: searchQuery, phone, customerId, itemId, itemNumber } =
        input

    let phoneCanonical: string | null = null
    if (phone) {
        phoneCanonical = canonicalizePhone(phone)
        if (!phoneCanonical) {
            throw new BotServiceError(
                'رقم الهاتف غير صالح',
                400,
                'VALIDATION_ERROR'
            )
        }
    }

    const resolvedCustomerId = await resolveCustomerId(
        customerId,
        phoneCanonical
    )

    let resolvedItemId: string | null = null
    let productName: string | null = null
    if (itemId || itemNumber) {
        const item = await resolveItemRef({
            itemId: itemId ?? undefined,
            itemNumber: itemNumber ?? undefined,
        })
        resolvedItemId = item.id
        productName = item.name
    }

    const since = new Date(Date.now() - DEDUP_WINDOW_MS)
    const existing = await prisma.aiNotification.findFirst({
        where: {
            type,
            searchQuery,
            customerId: resolvedCustomerId,
            isArchived: false,
            createdAt: { gte: since },
        },
        select: { id: true, type: true },
        orderBy: { createdAt: 'desc' },
    })

    if (existing) {
        return { id: existing.id, type: existing.type, created: false }
    }

    const created = await prisma.aiNotification.create({
        data: {
            type,
            searchQuery,
            itemId: resolvedItemId,
            productName,
            customerId: resolvedCustomerId,
            phoneNumber: phoneCanonical,
            source: 'bot',
        },
        select: { id: true, type: true },
    })

    return { id: created.id, type: created.type, created: true }
}
