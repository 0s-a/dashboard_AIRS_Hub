/**
 * app/api/announcements/[id]/progress/route.ts
 *
 * Lightweight polling endpoint for the Monitoring UI.
 * Returns Announcement counters + AnnouncementMessage status breakdown
 * so the DeliveryProgressPanel can display accurate real-time data.
 */

import { prisma }         from '@/lib/prisma'
import { getCurrentUser } from '@/lib/actions/auth'

export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const userRes = await getCurrentUser()
    if (!userRes.success) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const [ann, totalMessages, pendingCount, sentCount, failedCount] = await Promise.all([
        prisma.announcement.findUnique({
            where: { id },
            select: {
                status:           true,
                queueingProgress: true,
                sentAt:           true,
            },
        }),
        prisma.announcementMessage.count({ where: { announcementId: id } }),
        prisma.announcementMessage.count({ where: { announcementId: id, status: 'pending' } }),
        prisma.announcementMessage.count({ where: { announcementId: id, status: 'sent'    } }),
        prisma.announcementMessage.count({ where: { announcementId: id, status: 'failed'  } }),
    ])

    if (!ann) {
        return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Queueing progress percentage
    const queueingPct = ann.status === 'queueing' && ann.queueingProgress > 0
        ? Math.min(99, ann.queueingProgress)  // Never 100 during queueing
        : ann.status === 'queued' || ann.status === 'sent' ? 100 : 0

    return Response.json({
        status:        ann.status,
        sentAt:        ann.sentAt,
        totalMessages,
        successCount:  sentCount,
        failCount:     failedCount,
        pendingCount,
        sentCount,
        failedCount,
        queueingPct,
        queueingProgress: ann.queueingProgress,
    })
}
