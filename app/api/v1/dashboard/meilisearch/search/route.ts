import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api-utils'
import { requireDashboardAuth } from '@/lib/route-auth'
import { testMeilisearchSearch } from '@/lib/utils/meilisearch-sync'

// GET /api/v1/dashboard/meilisearch/search?q=...&limit=10&available=true&compare=1
export async function GET(req: NextRequest) {
    const authError = await requireDashboardAuth()
    if (authError) return authError

    const { searchParams } = new URL(req.url)
    const query     = (searchParams.get('q') || '').trim()
    const limit     = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const available = searchParams.get('available')
    const compare   = searchParams.get('compare') === '1' || searchParams.get('compare') === 'true'

    try {
        const result = await testMeilisearchSearch(query, {
            limit,
            isAvailable: available === 'true' ? true : available === 'false' ? false : undefined,
            compare,
        })

        return apiSuccess(result, 200)
    } catch (error) {
        console.error('[Meilisearch Search] Error:', error)
        return apiError('فشل البحث في Meilisearch', 500, {
            code: 'SEARCH_FAILED',
        })
    }
}
