// ─────────────────────────────────────────────────────────────────────────────
// Meilisearch Client — Singleton
// Resilient: connection errors are caught upstream; this module only
// creates the client instance and defines index settings.
// ─────────────────────────────────────────────────────────────────────────────

import { Meilisearch } from 'meilisearch'

// ── Env config ────────────────────────────────────────────────────────────────
const MEILISEARCH_HOST  = process.env.MEILISEARCH_HOST  || 'http://localhost:7700'
const MEILISEARCH_KEY   = process.env.MEILISEARCH_MASTER_KEY || ''
export const MEILI_INDEX = process.env.MEILISEARCH_INDEX || 'products'

// ── Singleton client ──────────────────────────────────────────────────────────
let _client: Meilisearch | null = null

export function getMeilisearchClient(): Meilisearch {
    if (!_client) {
        _client = new Meilisearch({
            host:    MEILISEARCH_HOST,
            apiKey:  MEILISEARCH_KEY,
        })
    }
    return _client
}

// ── Index settings ────────────────────────────────────────────────────────────
export const MEILI_SETTINGS = {
    searchableAttributes: [
        'name',
        'productNumber',
        'itemNumbers',
        'description',
        'brand',
        'category',
        'alternativeNames',
        'tags',
    ],
    filterableAttributes: [
        'isAvailable',
        'brandId',
        'categoryId',
        'tags',
    ],
    sortableAttributes: [
        'minPrice',
        'name',
        'createdAt',
    ],
    displayedAttributes: ['*'],
    rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
    ],
} as const

// ── Ensure index is configured — may throw if Meilisearch is unreachable ──────
// Callers are responsible for catching errors (see meilisearch-sync.ts)
export async function ensureIndexConfigured(): Promise<void> {
    const client = getMeilisearchClient()
    const index  = client.index(MEILI_INDEX)
    await index.updateSettings(MEILI_SETTINGS as any)
}
