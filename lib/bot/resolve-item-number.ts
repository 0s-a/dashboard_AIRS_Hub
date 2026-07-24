import { prisma } from '@/lib/prisma'
import {
    normalizeItemNumberForSearch,
    normalizeSearchQuery,
} from './normalize-search-query'

/**
 * Resolve an Item id by itemNumber with separator/digit normalization.
 * Exact candidates first, then regexp_replace fallback (spaces/dashes stripped).
 */
export async function findItemIdByItemNumber(
    raw: string
): Promise<string | null> {
    const trimmed = raw.trim()
    if (!trimmed) return null

    const skuNorm = normalizeItemNumberForSearch(trimmed)
    const candidates = [
        ...new Set(
            [trimmed, skuNorm, normalizeSearchQuery(trimmed)].filter(Boolean)
        ),
    ]

    const exact = await prisma.item.findFirst({
        where: { itemNumber: { in: candidates } },
        select: { id: true },
    })
    if (exact) return exact.id

    if (!skuNorm) return null

    const ids = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "Item"
        WHERE regexp_replace("itemNumber", '[\\s\\-_]+', '', 'g') ILIKE ${skuNorm}
        LIMIT 1
    `
    return ids[0]?.id ?? null
}
