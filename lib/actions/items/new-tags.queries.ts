'use server'

import { prisma } from '@/lib/actions/items/_shared'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import type { PaginationMeta } from '@/lib/types/item'
import { requireAuth } from '@/lib/auth-utils'

const NEW_TAGS_INCLUDE = {
    product: {
        select: {
            brand: { select: { id: true, name: true, code: true, logo: true } },
        },
    },
    itemImages: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true },
    },
} as const

export interface NewTagItem {
    id: string
    itemNumber: string
    name: string
    isNew: boolean
    brandRef: { id: string; name: string; code: string; logo: string | null }
    primaryImage: string | null
}

export interface NewTagsPaginationMeta extends PaginationMeta {}

function toNewTagItem(item: any): NewTagItem {
    const tags = Array.isArray(item.tags) ? item.tags : []
    const rawImg = item.itemImages?.[0]?.url ?? null
    const brand = item.product?.brand
    return {
        id: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
        isNew: tags.includes('new'),
        brandRef: {
            id: brand?.id ?? '',
            name: brand?.name ?? '',
            code: brand?.code ?? '',
            logo: brand?.logo ?? null,
        },
        primaryImage: rawImg ? toDisplayUrl(rawImg) : null,
    }
}

export async function getItemsForNewTags(params: {
    search?: string
    page?: number
    limit?: number
    filterNew?: boolean
}) {
    await requireAuth()
    const { search, page = 1, limit = 50, filterNew } = params
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(Math.max(1, limit), 200)
    const skip = (safePage - 1) * safeLimit

    const where: any = {}

    if (search?.trim()) {
        const q = search.trim()
        where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { itemNumber: { contains: q, mode: 'insensitive' } },
            { product: { brand: { name: { contains: q, mode: 'insensitive' } } } },
        ]
    }

    if (filterNew === true) {
        where.tags = { string_contains: 'new' }
    } else if (filterNew === false) {
        where.NOT = { tags: { string_contains: 'new' } }
    }

    const [items, total] = await Promise.all([
        prisma.item.findMany({
            where,
            skip,
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
            include: NEW_TAGS_INCLUDE,
        }),
        prisma.item.count({ where }),
    ])

    const pages = Math.ceil(total / safeLimit)

    return {
        success: true as const,
        data: items.map(toNewTagItem),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            pages,
            hasPrev: safePage > 1,
            hasNext: safePage < pages,
        } satisfies PaginationMeta,
    }
}
