import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api-utils'
import { requireDashboardAuth } from '@/lib/route-auth'
import { syncAllProductsToMeilisearch } from '@/lib/utils/meilisearch-sync'

// POST /api/v1/dashboard/meilisearch/sync
// Returns success even if Meilisearch is unavailable (unavailable: true in body)
export async function POST(req: NextRequest) {
    const authError = await requireDashboardAuth()
    if (authError) return authError

    // syncAllProductsToMeilisearch never throws — it catches all Meilisearch errors
    const result = await syncAllProductsToMeilisearch()
    return apiSuccess(result, 200)
}
