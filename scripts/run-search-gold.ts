/**
 * Manual gold runner for bot product search helpers + optional live search.
 *
 * Usage (host or inside nextjs container):
 *   npx tsx scripts/run-search-gold.ts
 *
 * Live search cases need DATABASE_URL / Prisma. Normalize+parse always run.
 * After shipping searchText changes: run a full Meili sync from the search-engine panel.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
    normalizeItemNumberForSearch,
    normalizeSearchQuery,
} from '../lib/bot/normalize-search-query'
import {
    parseProductQueryText,
    type ParseDictionary,
} from '../lib/bot/parse-product-query'

type GoldFile = {
    normalize: Array<{ id: string; input: string; expected: string }>
    skuNormalize: Array<{ id: string; input: string; expected: string }>
    parse: Array<{
        id: string
        q: string
        explicitBrand?: string
        explicitAttr?: string[]
        dict: { brands: Record<string, string>; attrs: Record<string, string> }
        expected: { brand?: string; attr: string[]; residualQ: string }
    }>
    search: Array<{
        id: string
        q: string
        parse?: boolean
        brand?: string
        attr?: string[]
        productCode?: string
        expectMinResults?: number
        expectProductShape?: boolean
        skip?: boolean
        note?: string
    }>
}

function buildDict(raw: {
    brands: Record<string, string>
    attrs: Record<string, string>
}): ParseDictionary {
    const brands = new Map(Object.entries(raw.brands))
    const attributeValues = new Map<string, string[]>()
    for (const [k, v] of Object.entries(raw.attrs)) {
        attributeValues.set(k, [v])
    }
    const sortPhrases = (keys: string[]) =>
        [...keys].sort((a, b) => {
            const aw = a.split(/\s+/).length
            const bw = b.split(/\s+/).length
            if (bw !== aw) return bw - aw
            return b.length - a.length
        })
    return {
        brands,
        attributeValues,
        brandPhrases: sortPhrases([...brands.keys()]),
        attrPhrases: sortPhrases([...attributeValues.keys()]),
    }
}

function assertEqual(label: string, actual: string, expected: string): boolean {
    if (actual === expected) {
        console.log(`  PASS ${label}`)
        return true
    }
    console.error(`  FAIL ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
    return false
}

async function main() {
    const path = resolve(process.cwd(), 'scripts/search-gold-queries.json')
    const gold = JSON.parse(readFileSync(path, 'utf8')) as GoldFile
    let failed = 0

    console.log('== normalizeSearchQuery ==')
    for (const c of gold.normalize) {
        const ok = assertEqual(c.id, normalizeSearchQuery(c.input), c.expected)
        if (!ok) failed++
    }

    console.log('== normalizeItemNumberForSearch ==')
    for (const c of gold.skuNormalize) {
        const ok = assertEqual(
            c.id,
            normalizeItemNumberForSearch(c.input),
            c.expected
        )
        if (!ok) failed++
    }

    console.log('== parseProductQueryText ==')
    for (const c of gold.parse) {
        const dict = buildDict(c.dict)
        const q = normalizeSearchQuery(c.q)
        const result = parseProductQueryText(q, dict, {
            explicitBrand: c.explicitBrand
                ? normalizeSearchQuery(c.explicitBrand)
                : undefined,
            explicitAttr: (c.explicitAttr ?? []).map(normalizeSearchQuery),
        })
        const brandOk = (result.brand ?? '') === (c.expected.brand ?? '')
        const attrOk =
            JSON.stringify(result.attr) === JSON.stringify(c.expected.attr)
        const residualOk = result.residualQ === c.expected.residualQ
        if (brandOk && attrOk && residualOk) {
            console.log(`  PASS ${c.id}`)
        } else {
            failed++
            console.error(`  FAIL ${c.id}`, {
                got: result,
                expected: c.expected,
            })
        }
    }

    console.log('== searchProducts (optional live) ==')
    try {
        // Dynamic import so normalize/parse gold still runs without Prisma on host
        const { searchProducts } = await import('../lib/bot/product-search')
        for (const c of gold.search) {
            if (c.skip) {
                console.log(`  SKIP ${c.id}`)
                continue
            }
            const { results, meta } = await searchProducts({
                q: c.q,
                brand: c.brand,
                attr: c.attr ?? [],
                parse: c.parse ?? true,
                productCode: c.productCode,
                page: 1,
                limit: 20,
            })
            const min = c.expectMinResults ?? 0
            let ok = results.length >= min
            if (ok && c.expectProductShape && results.length > 0) {
                const g = results[0] as {
                    product?: { code?: string; name?: string }
                    category?: string
                    brand?: string | null
                    items?: unknown[]
                }
                ok = Boolean(
                    g.product?.code &&
                        g.product?.name &&
                        typeof g.category === 'string' &&
                        Array.isArray(g.items)
                )
                if (!ok) {
                    console.error(`  FAIL ${c.id} expected product group shape`, g)
                }
            }
            if (ok && typeof meta.hasMore !== 'boolean') {
                ok = false
                console.error(`  FAIL ${c.id} meta.hasMore missing`)
            }
            if (ok) {
                console.log(
                    `  PASS ${c.id} (products=${results.length}, engine=${meta.engine}, hasMore=${meta.hasMore})`
                )
            } else if (results.length < min) {
                failed++
                console.error(
                    `  FAIL ${c.id} expected >= ${min}, got ${results.length}`
                )
            } else {
                failed++
            }
        }
    } catch (err) {
        console.warn(
            '  WARN live search skipped (DB/Meili unavailable):',
            err instanceof Error ? err.message : err
        )
    }

    console.log(
        '\nNote: after deploy, run a full Meili sync from the search-engine dashboard.'
    )

    if (failed > 0) {
        console.error(`\n${failed} failure(s)`)
        process.exit(1)
    }
    console.log('\nAll runnable gold checks passed.')
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
