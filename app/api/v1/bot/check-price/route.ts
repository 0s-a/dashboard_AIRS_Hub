
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

export async function POST(req: NextRequest) {
    // 1. Security Check
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { phoneNumber, productId } = body

        if (!phoneNumber || !productId) {
            return NextResponse.json({ error: 'Missing phoneNumber or productId' }, { status: 400 })
        }

        // 2. Get Product Price (Unified)
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: {
                productId: product.id,
                productName: product.name,
                price: product.price,
                currency: 'SAR'
            }
        })

    } catch (error) {
        console.error('API Price Check Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
"@/components/inventory/product-sheet"