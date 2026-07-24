import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api-utils'
import { requireDashboardAuth } from '@/lib/route-auth'
import { getMeilisearchStats } from '@/lib/utils/meilisearch-sync'
import { prisma } from '@/lib/prisma'

// GET /api/v1/dashboard/meilisearch/status
export async function GET(req: NextRequest) {
    const authError = await requireDashboardAuth()
    if (authError) return authError

    try {
        const [stats, dbCount] = await Promise.all([
            getMeilisearchStats(),
            prisma.item.count(),
        ])

        return apiSuccess({
            ...stats,
            dbItemCount: dbCount,
            inSync: stats.connected && stats.documentCount === dbCount,
        }, 200)
    } catch (error) {
        console.error('[Meilisearch Status] Error:', error)
        return apiError('فشل جلب حالة Meilisearch', 500)
    }
}
