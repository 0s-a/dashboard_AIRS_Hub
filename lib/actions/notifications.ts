'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'

const PATHS = '/notifications'

// ── Queries ──────────────────────────────────────────────

export async function getNotifications(filters?: {
    type?: 'out_of_stock' | 'not_found'
    isRead?: boolean
    limit?: number
    offset?: number
}) {
    return safeAction(
        () => prisma.aiNotification.findMany({
            where: {
                ...(filters?.type ? { type: filters.type } : {}),
                ...(filters?.isRead !== undefined ? { isRead: filters.isRead } : {}),
            },
            include: {
                product: {
                    select: { id: true, name: true, itemNumber: true, isAvailable: true },
                },
                person: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit ?? 50,
            skip: filters?.offset ?? 0,
        }),
        'تعذّر جلب الإشعارات'
    )
}

export async function getUnreadCount() {
    return safeAction(
        () => prisma.aiNotification.count({ where: { isRead: false } }),
        'تعذّر عدّ الإشعارات'
    )
}

export async function getNotificationStats() {
    return safeAction(
        async () => {
            const [total, unread, outOfStock, notFound] = await Promise.all([
                prisma.aiNotification.count(),
                prisma.aiNotification.count({ where: { isRead: false } }),
                prisma.aiNotification.count({ where: { type: 'out_of_stock' } }),
                prisma.aiNotification.count({ where: { type: 'not_found' } }),
            ])
            return { total, unread, outOfStock, notFound }
        },
        'تعذّر جلب الإحصائيات'
    )
}

// ── Mutations ────────────────────────────────────────────

export async function markAsRead(id: string) {
    return safeActionWithRevalidation(
        () => prisma.aiNotification.update({
            where: { id },
            data: { isRead: true },
        }),
        PATHS,
        'تعذّر تحديث الإشعار'
    )
}

export async function markAllAsRead() {
    return safeActionWithRevalidation(
        () => prisma.aiNotification.updateMany({
            where: { isRead: false },
            data: { isRead: true },
        }),
        PATHS,
        'تعذّر تعيين الكل مقروء'
    )
}

export async function deleteNotification(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await prisma.aiNotification.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر حذف الإشعار'
    )
}

export async function clearOldNotifications(daysOld: number = 30) {
    return safeActionWithRevalidation(
        async () => {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - daysOld)
            const result = await prisma.aiNotification.deleteMany({
                where: { createdAt: { lt: cutoff } },
            })
            return { deleted: result.count }
        },
        PATHS,
        'تعذّر مسح الإشعارات القديمة'
    )
}

// ── Create (called by Bot API) ───────────────────────────

export async function createNotification(data: {
    type: 'out_of_stock' | 'not_found'
    searchQuery: string
    productId?: string
    productName?: string
    personId?: string
    source?: string
    phoneNumber?: string
}) {
    return safeAction(
        () => prisma.aiNotification.create({ data }),
        'تعذّر إنشاء الإشعار'
    )
}
