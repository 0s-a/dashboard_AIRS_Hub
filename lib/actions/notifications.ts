'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'

const PATHS = '/notifications'

// ── Queries ──────────────────────────────────────────────

export async function getNotifications(filters?: {
    type?: 'out_of_stock' | 'not_found'
    isRead?: boolean
    isArchived?: boolean
    limit?: number
    offset?: number
}) {
    return safeAction(
        () => prisma.aiNotification.findMany({
            where: {
                isArchived: filters?.isArchived ?? false,
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
        () => prisma.aiNotification.count({ where: { isRead: false, isArchived: false } }),
        'تعذّر عدّ الإشعارات'
    )
}

export async function getNotificationStats() {
    return safeAction(
        async () => {
            const [total, unread, outOfStock, notFound, archived] = await Promise.all([
                prisma.aiNotification.count({ where: { isArchived: false } }),
                prisma.aiNotification.count({ where: { isRead: false, isArchived: false } }),
                prisma.aiNotification.count({ where: { type: 'out_of_stock', isArchived: false } }),
                prisma.aiNotification.count({ where: { type: 'not_found', isArchived: false } }),
                prisma.aiNotification.count({ where: { isArchived: true } }),
            ])
            return { total, unread, outOfStock, notFound, archived }
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

export async function archiveNotification(id: string, reason: string) {
    return safeActionWithRevalidation(
        () => prisma.aiNotification.update({
            where: { id },
            data: {
                isArchived: true,
                isRead: true,
                archivedAt: new Date(),
                archiveReason: reason,
            },
        }),
        PATHS,
        'تعذّر أرشفة الإشعار'
    )
}

export async function archiveAllRead() {
    return safeActionWithRevalidation(
        () => prisma.aiNotification.updateMany({
            where: { isRead: true, isArchived: false },
            data: {
                isArchived: true,
                archivedAt: new Date(),
                archiveReason: 'تم القراءة',
            },
        }),
        PATHS,
        'تعذّر أرشفة الكل'
    )
}

export async function unarchiveNotification(id: string) {
    return safeActionWithRevalidation(
        () => prisma.aiNotification.update({
            where: { id },
            data: {
                isArchived: false,
                archivedAt: null,
                archiveReason: null,
            },
        }),
        PATHS,
        'تعذّر إلغاء الأرشفة'
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
