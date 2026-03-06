
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

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
        },
        orderBy: { createdAt: 'asc' as const },
    },
    variants: {
        select: { id: true, variantNumber: true, suffix: true, name: true, type: true, hex: true, price: true, isDefault: true, order: true },
        orderBy: { order: 'asc' as const },
    },
}

// GET /api/v1/bot/products — List products (optional ?search= &available= &category=)
export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search')
        const available = searchParams.get('available')
        const category = searchParams.get('category')

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

        const products = await prisma.product.findMany({
            where,
            include: PRODUCT_INCLUDE,
            orderBy: { name: 'asc' },
        })

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
                unit: pp.unit,
                quantity: pp.quantity,
                currency: pp.currency,
            })),
            variants: p.variants,
        }))

        return NextResponse.json({ success: true, data, count: data.length })
    } catch (error) {
        console.error('API Error [GET /products]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
