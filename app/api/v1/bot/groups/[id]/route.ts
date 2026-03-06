import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

const GROUP_INCLUDE = {
    person: { select: { id: true, name: true } },
}

// GET /api/v1/bot/groups/[id] — Get single group
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const group = await prisma.group.findUnique({
            where: { id },
            include: GROUP_INCLUDE,
        })

        if (!group) {
            return NextResponse.json({ error: 'المجموعة غير موجودة' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: group })
    } catch (error) {
        console.error('API Error [GET /groups/id]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PUT /api/v1/bot/groups/[id] — Update group
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await req.json()

        const existing = await prisma.group.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'المجموعة غير موجودة' }, { status: 404 })
        }

        const group = await prisma.group.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: body.name.trim() }),
                ...(body.number !== undefined && { number: body.number.trim() }),
                ...(body.category !== undefined && { category: body.category || null }),
                ...(body.tags !== undefined && { tags: body.tags }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
                ...(body.personId !== undefined && { personId: body.personId || null }),
            },
            include: GROUP_INCLUDE,
        })

        return NextResponse.json({ success: true, data: group })
    } catch (error: any) {
        console.error('API Error [PUT /groups/id]:', error)
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'رقم المجموعة مسجل بالفعل' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE /api/v1/bot/groups/[id] — Delete group
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        const existing = await prisma.group.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'المجموعة غير موجودة' }, { status: 404 })
        }

        await prisma.group.delete({ where: { id } })
        return NextResponse.json({ success: true, message: 'تم حذف المجموعة بنجاح' })
    } catch (error) {
        console.error('API Error [DELETE /groups/id]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
