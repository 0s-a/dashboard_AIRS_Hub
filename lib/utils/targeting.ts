/**
 * lib/utils/targeting.ts
 *
 * Targeting resolution utilities for the Announcement system.
 * Uses cursor-based streaming to avoid loading all records into memory at once.
 * Supports both Inclusion and Exclusion filters.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { PersonFilters, ProductFilters, PersonPayload, ProductPayload } from '@/lib/types/announcements'
import { toExternalUrl, toDisplayUrl } from '@/lib/utils/image-paths'

export type { PersonFilters, ProductFilters, PersonPayload, ProductPayload }

// ─── Where Clause Builders ────────────────────────────────────────────────────

export function buildPersonWhere(
    filters: PersonFilters,
    manualIds: string[],
): Prisma.PersonWhereInput {
    const AND: Prisma.PersonWhereInput[] = [
        { isActive: filters.isActive ?? true },
    ]

    // ── Advanced Builder Mode (filterGroups) ──────────────────────────────────
    if (filters.filterGroups?.length) {
        for (const group of filters.filterGroups) {
            if (!group.conditions.length) continue

            // Partition conditions into inclusion vs exclusion
            const inclusions = group.conditions.filter(c => c.type !== 'exclude_tag')
            const exclusions = group.conditions.filter(c => c.type === 'exclude_tag')

            // OR within inclusion conditions in this group
            if (inclusions.length > 0) {
                const OR: Prisma.PersonWhereInput[] = inclusions.map(c => {
                    switch (c.type) {

                        case 'group': return { groupName: c.value }
                        case 'tag':   return { tags: { some: { tag: { name: c.value } } } }
                        default:      return {}
                    }
                })
                AND.push({ OR })
            }

            // AND-NOT for exclusions in this group
            for (const c of exclusions) {
                AND.push({ NOT: { tags: { some: { tag: { name: c.value } } } } })
            }
        }

        // Manual IDs always included
        if (manualIds.length) AND.push({ id: { in: manualIds } })

        return { AND }
    }

    // ── Legacy Flat-Filter Mode ───────────────────────────────────────────────
    if (!filters.all) {
        const OR: Prisma.PersonWhereInput[] = []


        if (filters.groupNames?.length)
            OR.push({ groupName: { in: filters.groupNames } })

        if (filters.tags?.length)
            OR.push({ OR: filters.tags.map(tag => ({ tags: { some: { tag: { name: tag } } } })) })

        if (manualIds.length)
            OR.push({ id: { in: manualIds } })

        if (OR.length > 0)
            AND.push({ OR })
        else if (!filters.all && manualIds.length === 0)
            AND.push({ id: { in: [] } })
    }

    // ─── Exclusions ───────────────────────────────────────────────────────────
    if (filters.excludeTags?.length) {
        AND.push({
            NOT: {
                OR: filters.excludeTags.map(tag => ({ tags: { some: { tag: { name: tag } } } })),
            },
        })
    }
    if (filters.excludeIds?.length) {
        AND.push({ NOT: { id: { in: filters.excludeIds } } })
    }

    return { AND }
}


export function buildProductWhere(
    filters: ProductFilters
): Prisma.ProductWhereInput {
    const AND: Prisma.ProductWhereInput[] = [{ isAvailable: true }]

    if (!filters.all) {
        const OR: Prisma.ProductWhereInput[] = []

        if (filters.categoryIds?.length)
            OR.push({ categoryId: { in: filters.categoryIds } })

        if (filters.tags?.length)
            OR.push({ OR: filters.tags.map(tag => ({ tags: { array_contains: tag } })) })

        if (OR.length > 0)
            AND.push({ OR })
        else
            AND.push({ id: { in: [] } })
    }

    if (filters.excludeTags?.length) {
        AND.push({
            NOT: {
                OR: filters.excludeTags.map(tag => ({ tags: { array_contains: tag } })),
            },
        })
    }

    return { AND }
}

// ─── Cursor-Based Person Streaming ────────────────────────────────────────────
/**
 * Yields PersonPayload chunks of `chunkSize` using cursor pagination.
 * Never loads the full audience into memory — safe for 100k+ records.
 */
export async function* streamPersons(
    filters: PersonFilters,
    manualIds: string[],
    chunkSize: number
): AsyncGenerator<PersonPayload[]> {
    const where = buildPersonWhere(filters, manualIds)
    let cursor: string | undefined

    while (true) {
        const batch = await prisma.person.findMany({
            where,
            select: {
                id:          true,
                name:        true,
                groupName:   true,
                groupNumber: true,
                contacts: {
                    where:  { type: { in: ['whatsapp', 'phone'] } },
                    select: { type: true, value: true },
                },
                priceLabels: {
                    select: { priceLabelId: true },
                },
            },
            take: chunkSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: 'asc' },
        })

        if (batch.length === 0) break

        yield batch.map((p: any) => ({
            id:            p.id,
            name:          p.name,
            groupName:     p.groupName,
            groupNumber:   p.groupNumber,
            priceLabelIds: (p.priceLabels ?? []).map((pl: any) => pl.priceLabelId),
            contacts:      p.contacts,
        })) as PersonPayload[]

        if (batch.length < chunkSize) break
        cursor = batch[batch.length - 1].id
    }
}

// ─── Count helpers (for preview & validation) ─────────────────────────────────

export async function countPersons(
    filters: PersonFilters,
    manualIds: string[]
): Promise<number> {
    const where = buildPersonWhere(filters, manualIds)
    return prisma.person.count({ where })
}

export async function countProducts(
    filters: ProductFilters,
    manualIds: string[]
): Promise<number> {
    const productWhere = buildProductWhere(filters)

    if (manualIds.length === 0) {
        return prisma.product.count({ where: productWhere })
    }

    const [filtered, manual] = await Promise.all([
        prisma.product.count({ where: productWhere }),
        prisma.product.count({ where: { id: { in: manualIds } } }),
    ])

    return Math.max(filtered, manual)
}

// ─── Resolve full product payload (small list — load fully) ──────────────────

const PRODUCT_SELECT = {
    id:          true,
    name:        true,
    itemNumber:  true,
    brand:       true,
    description: true,
    tags:        true,
    category: {
        select: { name: true },
    },
    variants: {
        select: { id: true, name: true, hex: true, variantNumber: true, price: true },
        orderBy: { order: 'asc' } as const,
    },
    productPrices: {
        select: {
            value:        true,
            priceLabelId: true,
            priceLabel:   { select: { name: true } },
            currency:     { select: { name: true, symbol: true, isDefault: true } },
            unit:         { select: { name: true } },
        },
        orderBy: { priceLabel: { name: 'asc' } } as const,
    },
    productUnits: {
        select: {
            isBase:           true,
            conversionFactor: true,
            barcode:          true,
            unit:             { select: { name: true } },
        },
        orderBy: { order: 'asc' } as const,
    },
    productImages: {
        select:  { url: true, isPrimary: true },
        orderBy: { order: 'asc' } as const,
    },
}

/**
 * Converts a sub-path (e.g. "products/001-bf-607/main.webp") to an absolute
 * URL using NEXT_PUBLIC_BASE_URL so n8n / WhatsApp can fetch images directly.
 *
 * Falls back to the path as-is if it is already an absolute URL.
 */
function toAbsoluteUrl(subPath: string | undefined | null): string | null {
    if (!subPath) return null
    if (subPath.startsWith('http://') || subPath.startsWith('https://')) return subPath
    return toExternalUrl(subPath)
}

function toProductPayload(p: any): ProductPayload {
    const primaryImage = p.productImages?.find((i: any) => i.isPrimary)?.url
        ?? p.productImages?.[0]?.url
        ?? null


    return {
        id:          p.id,
        name:        p.name,
        itemNumber:  p.itemNumber,
        brand:       p.brand       ?? null,
        description: p.description ?? null,
        category:    p.category?.name ?? null,
        tags:        Array.isArray(p.tags) ? p.tags : [],
        variants:    (p.variants ?? []).map((v: any) => ({
            id:            v.id,
            name:          v.name,
            hex:           v.hex   ?? null,
            variantNumber: v.variantNumber,
            price:         v.price != null ? String(v.price) : null,
        })),
        prices: (p.productPrices ?? []).map((pp: any) => ({
            priceLabelId:      pp.priceLabelId ?? '',
            label:             pp.priceLabel?.name ?? '',
            value:             String(pp.value ?? 0),
            currency:          pp.currency?.name   ?? '',
            symbol:            pp.currency?.symbol ?? '',
            unit:              pp.unit?.name        ?? '',
            isDefaultCurrency: pp.currency?.isDefault ?? false,
        })),
        units: (p.productUnits ?? []).map((pu: any) => ({
            name:             pu.unit?.name ?? '',
            isBase:           pu.isBase,
            conversionFactor: pu.conversionFactor,
            barcode:          pu.barcode ?? null,
        })),
        imageUrl:  toAbsoluteUrl(primaryImage),
        allImages: (p.productImages ?? [])
            .map((i: any) => toAbsoluteUrl(i.url))
            .filter((u: string | null): u is string => !!u),
    }
}


export async function resolveProducts(
    filters: ProductFilters,
    manualIds: string[]
): Promise<ProductPayload[]> {
    const where = buildProductWhere(filters)

    const fromFilters = filters.all || Object.keys(filters).filter(k => k !== 'all').length > 0
        ? await prisma.product.findMany({ where, select: PRODUCT_SELECT })
        : []

    const fromManual = manualIds.length > 0
        ? await prisma.product.findMany({
            where:  { id: { in: manualIds }, isAvailable: true },
            select: PRODUCT_SELECT,
        })
        : []

    // Deduplicate by id
    const map = new Map<string, ProductPayload>()
    for (const p of [...fromFilters, ...fromManual]) map.set(p.id, toProductPayload(p))
    return [...map.values()]
}
