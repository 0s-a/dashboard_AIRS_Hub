// ─────────────────────────────────────────────────────────────────────────────
// Meilisearch Sync Utilities
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { getMeilisearchClient, MEILI_INDEX, ensureIndexConfigured } from '@/lib/meilisearch'
import {
    normalizeItemNumberForSearch,
    normalizeSearchQuery,
} from '@/lib/bot/normalize-search-query'
import { resolveProductDisplayName } from '@/lib/utils/product-display-name'

const BATCH_SIZE = 500

export interface MeiliProductDocument {
    id:               string
    itemNumber:       string | null
    /** Indexed display name (family name when inheriting) */
    name:             string
    /** Stored product.name — searchable via searchText when different from display */
    productName:      string
    familyId:         string | null
    brand:            string | null
    category:         string | null
    attributeText:    string[]
    /** Attribute values only — used for AND filters on Bot search */
    attributeValues:  string[]
    tags:             string[]
    alternativeNames: string[]
    /** Concatenated searchable blob for loose multi-token bot queries */
    searchText:       string
    isAvailable:      boolean
}

export interface MeiliProductIdsResult {
    ids: string[]
    estimatedTotal: number
    processingTimeMs: number
    unavailable?: boolean
}

export interface SearchProductIdsOptions {
    limit: number
    offset: number
    brand?: string
    attributeValues?: string[]
    isAvailable?: boolean
    /** Exclude a document id (e.g. exact SKU already pinned on page 1) */
    excludeId?: string
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
    family: { select: { id: true, name: true } },
    productAttributes: {
        include: { attribute: { select: { name: true, code: true } } },
    },
} as const

function normalizeTextList(values: unknown): string[] {
    if (!Array.isArray(values)) return []
    return values
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .map(v => normalizeSearchQuery(v))
        .filter(Boolean)
}

function toMeiliDocument(product: any): MeiliProductDocument {
    const rows = product.productAttributes || []
    const attributeText = rows
        .map((row: any) => {
            const name = row.attribute?.name ?? row.attribute?.code ?? ''
            const value = row.value ?? ''
            const raw = name && value ? `${name}: ${value}` : value
            return typeof raw === 'string' && raw.trim() ? normalizeSearchQuery(raw) : ''
        })
        .filter(Boolean)

    const attributeValues = rows
        .map((row: any) =>
            typeof row.value === 'string' ? normalizeSearchQuery(row.value) : ''
        )
        .filter(Boolean)

    const itemNumber =
        product.itemNumber != null
            ? normalizeItemNumberForSearch(String(product.itemNumber))
            : null

    const productNameRaw = product.name ?? ''
    const displayRaw = resolveProductDisplayName({
        name: productNameRaw,
        inheritsFamilyName: product.inheritsFamilyName,
        family: product.family,
    })
    const name = normalizeSearchQuery(displayRaw)
    const productName = normalizeSearchQuery(productNameRaw)
    const familyName = product.family?.name
        ? normalizeSearchQuery(product.family.name)
        : null
    const brand = product.brandRef?.name
        ? normalizeSearchQuery(product.brandRef.name)
        : null
    const category = product.category?.name
        ? normalizeSearchQuery(product.category.name)
        : null
    const tags = normalizeTextList(product.tags)
    const alternativeNames = normalizeTextList(product.alternativeNames)

    const searchText = [
        name,
        productName !== name ? productName : null,
        familyName && familyName !== name ? familyName : null,
        ...alternativeNames,
        brand,
        category,
        ...attributeText,
        ...attributeValues,
        ...tags,
        itemNumber,
    ]
        .filter((part): part is string => Boolean(part && String(part).trim()))
        .join(' ')

    return {
        id: product.id,
        itemNumber: itemNumber || null,
        name,
        productName,
        familyId: product.familyId ?? null,
        brand,
        category,
        attributeText,
        attributeValues,
        tags,
        alternativeNames,
        searchText,
        isAvailable: product.isAvailable ?? true,
    }
}

/** Escape a value for Meilisearch filter string literals. */
function escapeMeiliFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildProductSearchFilter(options: SearchProductIdsOptions): string | undefined {
    const parts: string[] = []
    if (options.brand) {
        parts.push(`brand = "${escapeMeiliFilterValue(options.brand)}"`)
    }
    for (const value of options.attributeValues ?? []) {
        parts.push(`attributeValues = "${escapeMeiliFilterValue(value)}"`)
    }
    if (options.isAvailable !== undefined) {
        parts.push(`isAvailable = ${options.isAvailable}`)
    }
    if (options.excludeId) {
        parts.push(`id != "${escapeMeiliFilterValue(options.excludeId)}"`)
    }
    return parts.length > 0 ? parts.join(' AND ') : undefined
}

/**
 * Fuzzy / full-text product id search for Bot API.
 * Resilient: returns `{ unavailable: true }` when Meilisearch is down.
 */
export async function searchProductIdsInMeilisearch(
    query: string,
    options: SearchProductIdsOptions
): Promise<MeiliProductIdsResult> {
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const filter = buildProductSearchFilter(options)
        const result = await index.search(query, {
            limit: options.limit,
            offset: options.offset,
            filter,
            attributesToRetrieve: ['id'],
        })
        const ids = result.hits
            .map(hit => (hit as { id?: string }).id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        return {
            ids,
            estimatedTotal: result.estimatedTotalHits ?? ids.length,
            processingTimeMs: result.processingTimeMs,
        }
    } catch (err) {
        console.warn('[Meilisearch] searchProductIds failed:', err)
        return { ids: [], estimatedTotal: 0, processingTimeMs: 0, unavailable: true }
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

/** Re-index many products (e.g. after family name change). Non-fatal per id. */
export async function upsertProductsToMeilisearch(productIds: string[]): Promise<void> {
    const unique = [...new Set(productIds.filter(Boolean))]
    for (const id of unique) {
        await upsertProductToMeilisearch(id)
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
