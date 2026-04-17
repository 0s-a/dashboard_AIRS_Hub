import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, parsePagination, paginationMeta } from '@/lib/api-utils'

const PRODUCT_INCLUDE = {
    category: { select: { id: true, name: true, icon: true } },
    productImages: {
        include: { mediaImage: { select: { url: true, alt: true } } },
        orderBy: { order: 'asc' as const },
    },
    productPrices: {
        include: {
            priceLabel: { select: { id: true, name: true } },
            currency: { select: { id: true, code: true, symbol: true, name: true } },
            unit: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' as const },
    },
    variants: {
        select: { id: true, variantNumber: true, suffix: true, name: true, type: true, hex: true, price: true, isDefault: true, order: true },
        orderBy: { order: 'asc' as const },
    },
}

// GET /api/v1/bot/products — List products (with search, pagination, filters)
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || searchParams.get('q')
        const available = searchParams.get('available')
        const category = searchParams.get('category')
        const { page, limit, skip } = parsePagination(searchParams)

        const where: any = {}
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { itemNumber: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ]
        }
        if (available === 'true') where.isAvailable = true
        if (available === 'false') where.isAvailable = false
        if (category) where.categoryId = category

        const [totalCount, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                include: PRODUCT_INCLUDE,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            })
        ])

        // Flatten for easier bot consumption
        const data = products.map(p => ({
            id: p.id,
            itemNumber: p.itemNumber,
            name: p.name,
            brand: p.brand,
            description: p.description,
            isAvailable: p.isAvailable,
            category: p.category,
            images: p.productImages.map(pi => ({
                url: pi.mediaImage.url,
                alt: pi.mediaImage.alt,
                isPrimary: pi.isPrimary,
            })),
            prices: p.productPrices.map(pp => ({
                id: pp.id,
                label: pp.priceLabel.name,
                value: pp.value,
                unit: (pp as any).unit?.name ?? null,
                currency: pp.currency,
            })),
            variants: p.variants,
        }))

        return NextResponse.json({ 
            success: true, 
            data, 
            count: data.length,
            pagination: paginationMeta(totalCount, page, limit),
        })
    } catch (error) {
        console.error('API Error [GET /products]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
