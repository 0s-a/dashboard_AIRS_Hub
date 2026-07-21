import { normalizeSearchQuery } from './normalize-search-query'

const DICT_TTL_MS = 90_000

export interface ParseDictionary {
    /** normalized brand name → original brand name */
    brands: Map<string, string>
    /** normalized attribute value → original value(s) */
    attributeValues: Map<string, string[]>
    /** phrases sorted longest-first for greedy matching */
    brandPhrases: string[]
    attrPhrases: string[]
}

export interface ParsedProductQuery {
    brand?: string
    attr: string[]
    residualQ: string
    /** Filters that came from parsing q (not explicit query params) */
    extractedBrand?: string
    extractedAttr: string[]
}

type CacheEntry = { loadedAt: number; dict: ParseDictionary }

let cache: CacheEntry | null = null

function phraseWordCount(phrase: string): number {
    return phrase.split(/\s+/).filter(Boolean).length
}

function sortPhrasesLongestFirst(phrases: string[]): string[] {
    return [...phrases].sort((a, b) => {
        const byWords = phraseWordCount(b) - phraseWordCount(a)
        if (byWords !== 0) return byWords
        return b.length - a.length
    })
}

/** Load brands + distinct attribute values; cached in-memory with short TTL. */
export async function getParseDictionary(): Promise<ParseDictionary> {
    const now = Date.now()
    if (cache && now - cache.loadedAt < DICT_TTL_MS) {
        return cache.dict
    }

    const { prisma } = await import('@/lib/prisma')

    const [brands, attrRows] = await Promise.all([
        prisma.brand.findMany({ select: { name: true } }),
        prisma.productAttributeValue.findMany({
            select: { value: true },
            distinct: ['value'],
        }),
    ])

    const brandMap = new Map<string, string>()
    for (const b of brands) {
        const key = normalizeSearchQuery(b.name)
        if (key) brandMap.set(key, b.name)
    }

    const ALLOWED_SHORT = new Set(['s', 'm', 'l', 'xl', 'xxl'])
    const attrMap = new Map<string, string[]>()
    for (const row of attrRows) {
        const key = normalizeSearchQuery(row.value)
        if (!key) continue
        // Skip single-char / very short values except known size tokens in catalog
        if (key.length < 2 && !ALLOWED_SHORT.has(key.toLowerCase())) {
            continue
        }
        const list = attrMap.get(key) ?? []
        if (!list.includes(row.value)) list.push(row.value)
        attrMap.set(key, list)
    }

    const dict: ParseDictionary = {
        brands: brandMap,
        attributeValues: attrMap,
        brandPhrases: sortPhrasesLongestFirst([...brandMap.keys()]),
        attrPhrases: sortPhrasesLongestFirst([...attrMap.keys()]),
    }

    cache = { loadedAt: now, dict }
    return dict
}

/** Clear cache — useful for tests / after bulk catalog changes. */
export function clearParseDictionaryCache(): void {
    cache = null
}

/**
 * Remove a whole-phrase match from a tokenized query (space-separated).
 * Returns null if phrase not found as contiguous tokens.
 */
function removePhraseTokens(tokens: string[], phrase: string): string[] | null {
    const phraseTokens = phrase.split(/\s+/).filter(Boolean)
    if (phraseTokens.length === 0) return null

    for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
        let match = true
        for (let j = 0; j < phraseTokens.length; j++) {
            if (tokens[i + j] !== phraseTokens[j]) {
                match = false
                break
            }
        }
        if (match) {
            return [...tokens.slice(0, i), ...tokens.slice(i + phraseTokens.length)]
        }
    }
    return null
}

export interface ParseProductQueryOptions {
    /** Explicit brand from query string (already normalized) */
    explicitBrand?: string
    /** Explicit attrs from query string (already normalized) */
    explicitAttr?: string[]
}

/**
 * High-confidence parse of free-text q into brand/attr filters.
 * Explicit params win: do not extract brand if explicitBrand set;
 * do not add attr equal to an explicit attr value.
 */
export function parseProductQueryText(
    normalizedQ: string,
    dict: ParseDictionary,
    options: ParseProductQueryOptions = {}
): ParsedProductQuery {
    const explicitAttr = new Set(options.explicitAttr ?? [])
    let tokens = normalizedQ.split(/\s+/).filter(Boolean)
    let extractedBrand: string | undefined
    const extractedAttr: string[] = []

    if (!options.explicitBrand) {
        for (const phrase of dict.brandPhrases) {
            const next = removePhraseTokens(tokens, phrase)
            if (next) {
                extractedBrand = phrase
                tokens = next
                break
            }
        }
    }

    for (const phrase of dict.attrPhrases) {
        if (explicitAttr.has(phrase)) continue
        if (extractedAttr.includes(phrase)) continue
        // Single-char: only allow if in dictionary (sizes etc.)
        if (phrase.length < 2 && !dict.attributeValues.has(phrase)) continue

        const next = removePhraseTokens(tokens, phrase)
        if (next) {
            extractedAttr.push(phrase)
            tokens = next
        }
    }

    // Empty residual is allowed (filter-only search when q was only brand/attrs)
    const residualQ = tokens.join(' ').trim()

    const brand = options.explicitBrand ?? extractedBrand
    const attr = [
        ...new Set([...(options.explicitAttr ?? []), ...extractedAttr]),
    ]

    return {
        brand,
        attr,
        residualQ,
        extractedBrand,
        extractedAttr,
    }
}

/** Resolve original DB brand names for a normalized brand key. */
export function resolveBrandOriginals(
    normalizedBrand: string,
    dict: ParseDictionary
): string[] {
    const original = dict.brands.get(normalizedBrand)
    return original ? [original] : [normalizedBrand]
}

/** Resolve original DB attribute values for a normalized attr key. */
export function resolveAttrOriginals(
    normalizedAttr: string,
    dict: ParseDictionary
): string[] {
    return dict.attributeValues.get(normalizedAttr) ?? [normalizedAttr]
}
