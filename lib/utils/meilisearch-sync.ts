// ─────────────────────────────────────────────────────────────────────────────
// Meilisearch Sync Utilities — Item (SKU) documents
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { getMeilisearchClient, MEILI_INDEX, ensureIndexConfigured } from '@/lib/meilisearch'
import {
    normalizeItemNumberForSearch,
    normalizeSearchQuery,
} from '@/lib/bot/normalize-search-query'

const BATCH_SIZE = 500

export interface MeiliItemDocument {
    id:               string
    itemNumber:       string | null
    /** Indexed name (= Item.name; displayName synonym) */
    name:             string
    /** Parent Product (SPU) name */
    productName:      string
    productId:        string | null
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

/** @deprecated use MeiliItemDocument */
export type MeiliProductDocument = MeiliItemDocument

export interface MeiliItemIdsResult {
    ids: string[]
    estimatedTotal: number
    processingTimeMs: number
    unavailable?: boolean
}

/** @deprecated use MeiliItemIdsResult */
export type MeiliProductIdsResult = MeiliItemIdsResult

export interface SearchItemIdsOptions {
    limit: number
    offset: number
    brand?: string
    attributeValues?: string[]
    isAvailable?: boolean
    /** Restrict to a Product (SPU) id */
    productId?: string
    /** @deprecated use productId */
    familyId?: string
    /** Exclude a document id (e.g. exact SKU already pinned on page 1) */
    excludeId?: string
}

/** @deprecated use SearchItemIdsOptions */
export type SearchProductIdsOptions = SearchItemIdsOptions

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

/** Highlight markers from Meilisearch (`⟦…⟧`) — rendered in the playground UI */
export interface MeiliSearchHitHighlights {
    name?:             string
    productName?:      string
    itemNumber?:       string | null
    alternativeNames?: string[]
    attributeText?:    string[]
}

export interface MeiliSearchHit extends MeiliItemDocument {
    highlights?: MeiliSearchHitHighlights
}

export interface PrismaCompareHit {
    id:          string
    name:        string
    itemNumber:  string | null
    productName: string | null
    isAvailable: boolean
}

export interface PrismaCompareResult {
    hits:             PrismaCompareHit[]
    estimatedTotal:   number
    processingTimeMs: number
    onlyInMeili:      string[]
    onlyInPrisma:     string[]
    inBoth:           string[]
}

export interface MeiliSearchResult {
    hits:             MeiliSearchHit[]
    estimatedTotal:   number
    processingTimeMs: number
    query:            string
    unavailable?:     boolean
    prismaCompare?:   PrismaCompareResult
}

const MEILI_ITEM_INCLUDE = {
    product: {
        select: {
            id: true,
            name: true,
            brand: { select: { name: true } },
            category: { select: { name: true } },
        },
    },
    itemAttributes: {
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

function toMeiliDocument(item: any): MeiliItemDocument {
    const rows = item.itemAttributes || []
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
        item.itemNumber != null
            ? normalizeItemNumberForSearch(String(item.itemNumber))
            : null

    const name = normalizeSearchQuery(item.name ?? '')
    const productNameRaw = item.product?.name ?? ''
    const productName = productNameRaw ? normalizeSearchQuery(productNameRaw) : ''
    const brand = item.product?.brand?.name
        ? normalizeSearchQuery(item.product.brand.name)
        : null
    const category = item.product?.category?.name
        ? normalizeSearchQuery(item.product.category.name)
        : null
    const tags = normalizeTextList(item.tags)
    const alternativeNames = normalizeTextList(item.alternativeNames)

    const searchText = [
        name,
        productName && productName !== name ? productName : null,
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
        id: item.id,
        itemNumber: itemNumber || null,
        name,
        productName,
        productId: item.productId ?? item.product?.id ?? null,
        brand,
        category,
        attributeText,
        attributeValues,
        tags,
        alternativeNames,
        searchText,
        isAvailable: item.isAvailable ?? true,
    }
}

/** Escape a value for Meilisearch filter string literals. */
function escapeMeiliFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildItemSearchFilter(options: SearchItemIdsOptions): string | undefined {
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
    const productId = options.productId ?? options.familyId
    if (productId) {
        parts.push(`productId = "${escapeMeiliFilterValue(productId)}"`)
    }
    if (options.excludeId) {
        parts.push(`id != "${escapeMeiliFilterValue(options.excludeId)}"`)
    }
    return parts.length > 0 ? parts.join(' AND ') : undefined
}

/**
 * Fuzzy / full-text item id search for Bot API.
 * Resilient: returns `{ unavailable: true }` when Meilisearch is down.
 */
export async function searchItemIdsInMeilisearch(
    query: string,
    options: SearchItemIdsOptions
): Promise<MeiliItemIdsResult> {
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const filter = buildItemSearchFilter(options)
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
        console.warn('[Meilisearch] searchItemIds failed:', err)
        return { ids: [], estimatedTotal: 0, processingTimeMs: 0, unavailable: true }
    }
}

/** @deprecated use searchItemIdsInMeilisearch */
export const searchProductIdsInMeilisearch = searchItemIdsInMeilisearch

export async function syncAllItemsToMeilisearch(): Promise<SyncResult> {
    const startTime = Date.now()
    try {
        await ensureIndexConfigured()
    } catch (err) {
        console.warn('[Meilisearch] Service unavailable during sync:', err)
        return { synced: 0, errors: 0, duration: Date.now() - startTime, indexedAt: new Date().toISOString(), unavailable: true }
    }

    const client = getMeilisearchClient()
    const index = client.index(MEILI_INDEX)
    const totalCount = await prisma.item.count()

    let offset = 0, synced = 0, errors = 0

    while (offset < totalCount) {
        const batch = await prisma.item.findMany({
            skip: offset,
            take: BATCH_SIZE,
            include: MEILI_ITEM_INCLUDE,
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

/** @deprecated use syncAllItemsToMeilisearch */
export const syncAllProductsToMeilisearch = syncAllItemsToMeilisearch

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

export async function upsertItemToMeilisearch(itemId: string): Promise<void> {
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: MEILI_ITEM_INCLUDE,
        })
        if (!item) return
        await index.addDocuments([toMeiliDocument(item)], { primaryKey: 'id' })
    } catch (err) {
        console.warn('[Meilisearch] upsertItem failed (non-fatal):', err)
    }
}

/** Re-index many items (e.g. after product name/brand/category change). Non-fatal per id. */
export async function upsertItemsToMeilisearch(itemIds: string[]): Promise<void> {
    const unique = [...new Set(itemIds.filter(Boolean))]
    for (const id of unique) {
        await upsertItemToMeilisearch(id)
    }
}

/** Re-index all items belonging to a Product (SPU). */
export async function syncItemsByProductId(productId: string): Promise<void> {
    const items = await prisma.item.findMany({
        where: { productId },
        select: { id: true },
    })
    if (items.length === 0) return
    await upsertItemsToMeilisearch(items.map(i => i.id))
}

export async function removeItemFromMeilisearch(itemId: string): Promise<void> {
    try {
        const client = getMeilisearchClient()
        await client.index(MEILI_INDEX).deleteDocument(itemId)
    } catch (err) {
        console.warn('[Meilisearch] removeItem failed (non-fatal):', err)
    }
}

/** @deprecated use upsertItemToMeilisearch */
export const upsertProductToMeilisearch = upsertItemToMeilisearch
/** @deprecated use upsertItemsToMeilisearch */
export const upsertProductsToMeilisearch = upsertItemsToMeilisearch
/** @deprecated use removeItemFromMeilisearch */
export const deleteProductFromMeilisearch = removeItemFromMeilisearch

const HIGHLIGHT_PRE = '⟦'
const HIGHLIGHT_POST = '⟧'

type MeiliFormattedHit = MeiliItemDocument & {
    _formatted?: Partial<MeiliItemDocument>
}

function mapSearchHit(hit: MeiliFormattedHit): MeiliSearchHit {
    const { _formatted, ...doc } = hit
    if (!_formatted) return doc as MeiliSearchHit

    return {
        ...(doc as MeiliItemDocument),
        highlights: {
            name: _formatted.name,
            productName: _formatted.productName,
            itemNumber: _formatted.itemNumber,
            alternativeNames: Array.isArray(_formatted.alternativeNames)
                ? _formatted.alternativeNames
                : undefined,
            attributeText: Array.isArray(_formatted.attributeText)
                ? _formatted.attributeText
                : undefined,
        },
    }
}

/** Lightweight Prisma ILIKE sample — for dashboard search playground diagnostics only */
export async function samplePrismaItemSearch(
    query: string,
    options: { limit?: number; isAvailable?: boolean } = {}
): Promise<Omit<PrismaCompareResult, 'onlyInMeili' | 'onlyInPrisma' | 'inBoth'>> {
    const start = Date.now()
    const limit = options.limit ?? 10
    const trimmed = query.trim()
    const variants = [...new Set([trimmed, normalizeSearchQuery(trimmed)].filter(Boolean))]

    const textOr = variants.flatMap((v) => [
        { name: { contains: v, mode: 'insensitive' as const } },
        { itemNumber: { contains: v, mode: 'insensitive' as const } },
        { product: { name: { contains: v, mode: 'insensitive' as const } } },
        { product: { brand: { name: { contains: v, mode: 'insensitive' as const } } } },
    ])

    const where = {
        AND: [
            ...(options.isAvailable !== undefined ? [{ isAvailable: options.isAvailable }] : []),
            { OR: textOr },
        ],
    }

    const [rows, total] = await Promise.all([
        prisma.item.findMany({
            where,
            take: limit,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                itemNumber: true,
                isAvailable: true,
                product: { select: { name: true } },
            },
        }),
        prisma.item.count({ where }),
    ])

    return {
        hits: rows.map((r) => ({
            id: r.id,
            name: r.name,
            itemNumber: r.itemNumber,
            productName: r.product?.name ?? null,
            isAvailable: r.isAvailable,
        })),
        estimatedTotal: total,
        processingTimeMs: Date.now() - start,
    }
}

function buildPrismaCompare(
    meiliHits: MeiliSearchHit[],
    prismaSample: Omit<PrismaCompareResult, 'onlyInMeili' | 'onlyInPrisma' | 'inBoth'>
): PrismaCompareResult {
    const meiliIds = new Set(meiliHits.map((h) => h.id))
    const prismaIds = new Set(prismaSample.hits.map((h) => h.id))
    const onlyInMeili = [...meiliIds].filter((id) => !prismaIds.has(id))
    const onlyInPrisma = [...prismaIds].filter((id) => !meiliIds.has(id))
    const inBoth = [...meiliIds].filter((id) => prismaIds.has(id))

    return {
        ...prismaSample,
        onlyInMeili,
        onlyInPrisma,
        inBoth,
    }
}

export async function testMeilisearchSearch(
    query: string,
    options: { limit?: number; isAvailable?: boolean; compare?: boolean } = {}
): Promise<MeiliSearchResult> {
    const searchQ = normalizeSearchQuery(query.trim()) || query.trim()
    try {
        const client = getMeilisearchClient()
        const index = client.index(MEILI_INDEX)
        const filter: string[] = []
        if (options.isAvailable !== undefined) filter.push(`isAvailable = ${options.isAvailable}`)
        const result = await index.search(searchQ, {
            limit: options.limit ?? 10,
            filter: filter.length > 0 ? filter : undefined,
            attributesToHighlight: [
                'name',
                'productName',
                'itemNumber',
                'alternativeNames',
                'attributeText',
            ],
            highlightPreTag: HIGHLIGHT_PRE,
            highlightPostTag: HIGHLIGHT_POST,
        })

        const hits = (result.hits as MeiliFormattedHit[]).map(mapSearchHit)
        const base: MeiliSearchResult = {
            hits,
            estimatedTotal: result.estimatedTotalHits ?? hits.length,
            processingTimeMs: result.processingTimeMs,
            query: result.query,
        }

        if (!options.compare) return base

        const prismaSample = await samplePrismaItemSearch(query, {
            limit: options.limit,
            isAvailable: options.isAvailable,
        })
        return {
            ...base,
            prismaCompare: buildPrismaCompare(hits, prismaSample),
        }
    } catch (err) {
        console.warn('[Meilisearch] Search failed:', err)
        return { hits: [], estimatedTotal: 0, processingTimeMs: 0, query: searchQ, unavailable: true }
    }
}
