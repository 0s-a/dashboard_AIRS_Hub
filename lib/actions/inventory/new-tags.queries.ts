'use server'

import { prisma } from '@/lib/actions/inventory/_shared'
import { toDisplayUrl } from '@/lib/utils/image-paths'
import type { PaginationMeta } from '@/lib/types/product'
import { requireAuth } from '@/lib/auth-utils'

// Slim include — only what the new-tags page needs
const NEW_TAGS_INCLUDE = {
    brandRef: { select: { id: true, name: true, code: true, logo: true } },
    skcs: {
        orderBy: { order: 'asc' as const },
        select: {
            itemNumber: true,
            isDefault: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } },
        },
    },
} as const

export interface NewTagProduct {
    id: string
    productNumber: string
    itemNumber: string | null
    name: string
    isNew: boolean
    brandRef: { id: string; name: string; code: string; logo: string | null } | null
    primaryImage: string | null
}

export interface NewTagsPaginationMeta extends PaginationMeta {}

function toNewTagProduct(p: any): NewTagProduct {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const defaultSkc = (p.skcs || []).find((s: any) => s.isDefault) || p.skcs?.[0]
    const rawImg = defaultSkc?.images?.[0]?.url ?? null
    return {
        id: p.id,
        productNumber: p.productNumber,
        itemNumber: defaultSkc?.itemNumber ?? null,
        name: p.name,
        isNew: tags.includes('new'),
        brandRef: p.brandRef ?? null,
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
    const safePage  = Math.max(1, page)
    const safeLimit = Math.min(Math.max(1, limit), 200)
    const skip = (safePage - 1) * safeLimit

    const where: any = {}

    if (search?.trim()) {
        const q = search.trim()
        where.OR = [
            { name:        { contains: q, mode: 'insensitive' } },
            { productNumber: { contains: q, mode: 'insensitive' } },
            { skcs: { some: { itemNumber: { contains: q, mode: 'insensitive' } } } },
            { brandRef:    { name: { contains: q, mode: 'insensitive' } } },
        ]
    }

    // Filter by isNew tag if requested
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
