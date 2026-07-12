import { NextRequest } from 'next/server'
import { apiError, apiSuccess } from '@/lib/api-utils'
import { requireDashboardAuth } from '@/lib/route-auth'
import { getMeilisearchClient } from '@/lib/meilisearch'

// GET /api/v1/dashboard/meilisearch/indexes
export async function GET(req: NextRequest) {
    const authError = await requireDashboardAuth()
    if (authError) return authError

    try {
        const client = getMeilisearchClient()
        
        // Use pagination options limit/offset (can expand later if needed)
        const result = await client.getIndexes({ limit: 50 })
        
        // Fetch stats for all indexes to get documentCount and isIndexing
        const stats = await client.getStats()
        
        const indexes = result.results.map(index => {
            const indexStats = stats.indexes[index.uid]
            return {
                uid: index.uid,
                primaryKey: index.primaryKey,
                createdAt: index.createdAt,
                updatedAt: index.updatedAt,
                documentCount: indexStats?.numberOfDocuments ?? 0,
                isIndexing: indexStats?.isIndexing ?? false,
            }
        })

        return apiSuccess({ indexes }, 200)
    } catch (error) {
        console.error('[Meilisearch Indexes API] Error fetching indexes:', error)
        // If Meilisearch is down, we return success with an unavailable flag (consistent with our resilient design)
        return apiSuccess({ indexes: [], unavailable: true }, 200)
    }
}
