// ─────────────────────────────────────────────────────────────────────────────
// Meilisearch Client — Singleton
// Resilient: connection errors are caught upstream; this module only
// creates the client instance and defines index settings.
// ─────────────────────────────────────────────────────────────────────────────

import { Meilisearch } from 'meilisearch'

// ── Env config ────────────────────────────────────────────────────────────────
const MEILISEARCH_HOST  = process.env.MEILISEARCH_HOST  || 'http://localhost:7700'
const MEILISEARCH_KEY   = process.env.MEILISEARCH_MASTER_KEY || ''
export const MEILI_INDEX = process.env.MEILISEARCH_INDEX || 'items'

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
        'itemNumber',
        'name',
        'alternativeNames',
        'searchText',
        'brand',
        'attributeText',
        'category',
        'tags',
    ],
    filterableAttributes: [
        'id',
        'isAvailable',
        'brand',
        'category',
        'attributeValues',
        'productId',
    ],
    sortableAttributes: [
        'name',
    ],
    displayedAttributes: [
        'id',
        'itemNumber',
        'name',
        'productName',
        'productId',
        'brand',
        'category',
        'attributeText',
        'attributeValues',
        'tags',
        'alternativeNames',
        'searchText',
        'isAvailable',
    ],
    rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
    ],
    /** Small seed — extend as catalog synonyms grow */
    synonyms: {
        L: ['لارج', 'كبير', 'large'],
        لارج: ['L', 'كبير', 'large'],
        M: ['ميديم', 'وسط', 'medium'],
        ميديم: ['M', 'وسط', 'medium'],
        S: ['سمول', 'صغير', 'small'],
        سمول: ['S', 'صغير', 'small'],
        XL: ['اكس لارج', 'كبير جدا', 'xlarge'],
        قطن: ['cotton', 'قطنيه'],
        cotton: ['قطن', 'قطنيه'],
    },
} as const

// ── Ensure index is configured — may throw if Meilisearch is unreachable ──────
// Callers are responsible for catching errors (see meilisearch-sync.ts)
export async function ensureIndexConfigured(): Promise<void> {
    const client = getMeilisearchClient()
    const index  = client.index(MEILI_INDEX)
    await index.updateSettings(MEILI_SETTINGS as any)
}
