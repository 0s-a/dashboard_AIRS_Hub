import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-utils'

// POST /api/v1/bot/notifications — Create an AI notification
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const body = await req.json()
        const { type, searchQuery, productId, productName, phoneNumber, personId, source } = body

        if (!type || !searchQuery) {
            return NextResponse.json(
                { error: 'Missing required fields: type, searchQuery' },
                { status: 400 }
            )
        }

        if (!['out_of_stock', 'not_found'].includes(type)) {
            return NextResponse.json(
                { error: 'type must be "out_of_stock" or "not_found"' },
                { status: 400 }
            )
        }

        // Validate foreign keys — ignore invalid IDs instead of failing
        let validProductId: string | null = null
        let validPersonId: string | null = null

        if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
            validProductId = product?.id ?? null
        }
        if (personId) {
            const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } })
            validPersonId = person?.id ?? null
        }

        const notification = await prisma.aiNotification.create({
            data: {
                type,
                searchQuery,
                productId: validProductId,
                productName: productName || null,
                personId: validPersonId,
                phoneNumber: phoneNumber || null,
                source: source || 'bot',
            },
        })

        return NextResponse.json({ success: true, data: notification }, { status: 201 })
    } catch (error) {
        console.error('API Error [POST /notifications]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET /api/v1/bot/notifications — List notifications
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')
        const isRead = searchParams.get('isRead')
        const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

        const where: any = {}
        if (type) where.type = type
        if (isRead === 'true') where.isRead = true
        if (isRead === 'false') where.isRead = false

        const [notifications, unreadCount] = await Promise.all([
            prisma.aiNotification.findMany({
                where,
                include: {
                    person: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            prisma.aiNotification.count({ where: { isRead: false } }),
        ])

        return NextResponse.json({
            success: true,
            data: notifications,
            unreadCount,
            count: notifications.length,
        })
    } catch (error) {
        console.error('API Error [GET /notifications]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
