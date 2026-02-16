
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

export async function GET(req: NextRequest) {
    // 1. Security Check
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 2. Fetch Products
        const products = await prisma.product.findMany({
            where: { isAvailable: true },
            select: {
                id: true,
                itemNumber: true,
                name: true,
                category: true,
                description: true,
                price: true,
                imagePath: true
            }
        })

        return NextResponse.json({ success: true, data: products })
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
