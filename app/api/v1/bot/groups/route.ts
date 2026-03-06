import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

const GROUP_INCLUDE = {
    person: { select: { id: true, name: true } },
}

// GET /api/v1/bot/groups — List groups (optional ?search= &active= &category=)
export async function GET(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search')
        const active = searchParams.get('active')
        const category = searchParams.get('category')

        const where: any = {}
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { number: { contains: search, mode: 'insensitive' } },
            ]
        }
        if (active === 'true') where.isActive = true
        if (active === 'false') where.isActive = false
        if (category) where.category = category

        const groups = await prisma.group.findMany({
            where,
            include: GROUP_INCLUDE,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, data: groups, count: groups.length })
    } catch (error) {
        console.error('API Error [GET /groups]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/v1/bot/groups — Create a new group
export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()

        if (!body.name || !body.number) {
            return NextResponse.json({ error: 'الاسم ورقم المجموعة مطلوبان' }, { status: 400 })
        }

        const group = await prisma.group.create({
            data: {
                name: body.name.trim(),
                number: body.number.trim(),
                category: body.category || null,
                tags: body.tags || null,
                isActive: body.isActive !== undefined ? body.isActive : true,
                personId: body.personId || null,
            },
            include: GROUP_INCLUDE,
        })

        return NextResponse.json({ success: true, data: group }, { status: 201 })
    } catch (error: any) {
        console.error('API Error [POST /groups]:', error)
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'رقم المجموعة مسجل بالفعل' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
