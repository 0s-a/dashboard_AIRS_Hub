// ─────────────────────────────────────────────────────────────────────────────
// Meilisearch Sync Utilities
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { getMeilisearchClient, MEILI_INDEX, ensureIndexConfigured } from '@/lib/meilisearch'

const BATCH_SIZE = 500

export interface MeiliProductDocument {
    id:               string
    itemNumber:       string | null
    name:             string
    description:      string | null
    brand:            string | null
    brandId:          string | null
    category:         string | null
    categoryId:       string | null
    attributeText:    string[]
    tags:             string[]
    alternativeNames: string[]
    isAvailable:      boolean
    primaryImage:     string | null
    minPrice:         number | null
    createdAt:        string
}

export interface SyncResult {
    synced:    number
    errors:    number
    duration:  number
    indexedAt: string
    unavailable?: boolean
}

export interface MeiliStats {
    connected:      boolean
    documentCount:  number
    isIndexing:     boolean
    indexName:      string
    lastUpdated:    string | null
    host:           string
}

export interface MeiliSearchResult {
    hits:             MeiliProductDocument[]
    estimatedTotal:   number
    processingTimeMs: number
    query:            string
    unavailable?:     boolean
}

const MEILI_PRODUCT_INCLUDE = {
    brandRef: { select: { name: true } },
    category: { select: { name: true } },
    productAttributes: {
        include: { attribute: { select: { name: true, code: true } } },
    },
    productImages: { select: { url: true, isPrimary: true }, orderBy: { order: 'asc' as const } },
    productPrices: { select: { value: true } },
} as const

function toMeiliDocument(product: any): MeiliProductDocument {
    const primaryImage = product.productImages?.find((i: any) => i.isPrimary)?.url
        ?? product.productImages?.[0]?.url
        ?? null

    const prices = (product.productPrices || []).map((p: any) => Number(p.value))
    const minPrice = prices.length > 0 ? Math.min(...prices) : null

    const attributeText = (product.productAttributes || []).map((row: any) => {
        const name = row.attribute?.name ?? row.attribute?.code ?? ''
        const value = row.value ?? ''
        return name && value ? `${name}: ${value}` : value
    }).filter(Boolean)

    return {
        id: product.id,
        itemNumber: product.itemNumber ?? null,
        name: product.name,
        description: product.description ?? null,
        brand: product.brandRef?.name ?? null,
        brandId: product.brandId ?? null,
        category: product.category?.name ?? null,
        categoryId: product.categoryId ?? null,
        attributeText,
        tags: Array.isArray(product.tags) ? product.tags : [],
        alternativeNames: Array.isArray(product.alternativeNames) ? product.alternativeNames : [],
        isAvailable: product.isAvailable ?? true,
        primaryImage,
        minPrice,
        createdAt: product.createdAt instanceof Date
            ? product.createdAt.toISOString()
            : String(product.createdAt),
    }
}

export async function syncAllProductsToMeilisearch(): Promise<SyncResult> {
    const startTime = Date.now()
    try {
        await ensureIndexConfigured()
    } catch (err) {
        console.warn('[Meilisearch] Service unavailable during sync:', err)
        return { synced: 0, errors: 0, duration: Date.now() - startTime, indexedAt: new Date().toISOString(), unavailable: true }
    }

    const client = getMeilisearchClient()
    const index = client.index(MEILI_INDEX)
    const totalCount = await prisma.product.count()

    let offset = 0, synced = 0, errors = 0

    while (offset < totalCount) {
        const batch = await prisma.product.findMany({
            skip: offset,
            take: BATCH_SIZE,
            include: MEILI_PRODUCT_INCLUDE,
            orderBy: { createdAt: 'asc' },
        })
        if (batch.length === 0) break
        try {
            await index.addDocuments(batch.map(toMeiliDocument), { primaryKey: 'id' })
            synced += batch.length
        } catch (err) {
            console.error(`[Meilisearch] Batch failed at offset ${offset}:`, err)
            errors += batch.length
        }
        offset += BATCH_SIZE
    }

    return { synced, errors, duration: Date.now() - startTime, indexedAt: new Date().toISOString() }
}

export async function getMeilisearchStats(): Promise<MeiliStats> {
    const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700'
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const stats = await index.getStats()
        return { connected: true, documentCount: stats.numberOfDocuments, isIndexing: stats.isIndexing, indexName: MEILI_INDEX, lastUpdated: null, host }
    } catch {
        return { connected: false, documentCount: 0, isIndexing: false, indexName: MEILI_INDEX, lastUpdated: null, host }
    }
}

export async function upsertProductToMeilisearch(productId: string): Promise<void> {
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: MEILI_PRODUCT_INCLUDE,
        })
        if (!product) return
        await index.addDocuments([toMeiliDocument(product)], { primaryKey: 'id' })
    } catch (err) {
        console.warn('[Meilisearch] upsertProduct failed (non-fatal):', err)
    }
}

export async function deleteProductFromMeilisearch(productId: string): Promise<void> {
    try {
        const client = getMeilisearchClient()
        await client.index(MEILI_INDEX).deleteDocument(productId)
    } catch (err) {
        console.warn('[Meilisearch] deleteProduct failed (non-fatal):', err)
    }
}

export async function testMeilisearchSearch(
    query: string,
    options: { limit?: number; isAvailable?: boolean } = {}
): Promise<MeiliSearchResult> {
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const filter: string[] = []
        if (options.isAvailable !== undefined) filter.push(`isAvailable = ${options.isAvailable}`)
        const result = await index.search(query, {
            limit: options.limit ?? 10,
            filter: filter.length > 0 ? filter : undefined,
        })
        return {
            hits: result.hits as MeiliProductDocument[],
            estimatedTotal: result.estimatedTotalHits ?? result.hits.length,
            processingTimeMs: result.processingTimeMs,
            query: result.query,
        }
    } catch (err) {
        console.warn('[Meilisearch] Search failed:', err)
        return { hits: [], estimatedTotal: 0, processingTimeMs: 0, query, unavailable: true }
    }
}
