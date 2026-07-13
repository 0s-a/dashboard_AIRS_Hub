'use server'

import { prisma } from '@/lib/actions/inventory/_shared'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import type { PaginationMeta } from '@/lib/types/product'
import { requireAuth } from '@/lib/auth-utils'

const NEW_TAGS_INCLUDE = {
    brandRef: { select: { id: true, name: true, code: true, logo: true } },
    productImages: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true },
    },
} as const

export interface NewTagProduct {
    id: string
    itemNumber: string
    name: string
    isNew: boolean
    brandRef: { id: string; name: string; code: string; logo: string | null }
    primaryImage: string | null
}

export interface NewTagsPaginationMeta extends PaginationMeta {}

function toNewTagProduct(p: any): NewTagProduct {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const rawImg = p.productImages?.[0]?.url ?? null
    return {
        id: p.id,
        itemNumber: p.itemNumber,
        name: p.name,
        isNew: tags.includes('new'),
        brandRef: p.brandRef,
        primaryImage: rawImg ? toDisplayUrl(rawImg) : null,
    }
}

export async function getProductsForNewTags(params: {
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
            { brandRef: { name: { contains: q, mode: 'insensitive' } } },
        ]
    }

    if (filterNew === true) {
        where.tags = { string_contains: 'new' }
    } else if (filterNew === false) {
        where.NOT = { tags: { string_contains: 'new' } }
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
            include: NEW_TAGS_INCLUDE,
        }),
        prisma.product.count({ where }),
    ])

    const pages = Math.ceil(total / safeLimit)

    return {
        success: true as const,
        data: products.map(toNewTagProduct),
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
