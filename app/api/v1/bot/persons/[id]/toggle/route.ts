import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_API_KEY = process.env.BOT_API_KEY

// PATCH /api/v1/bot/persons/[id]/toggle — Toggle active/inactive
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== BOT_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        const existing = await prisma.person.findUnique({
            where: { id },
            select: { id: true, isActive: true, name: true },
        })

        if (!existing) {
            return NextResponse.json({ error: 'الشخص غير موجود' }, { status: 404 })
        }

        const person = await prisma.person.update({
            where: { id },
            data: { isActive: !existing.isActive },
            select: { id: true, name: true, isActive: true },
        })

        return NextResponse.json({
            success: true,
            data: person,
            message: person.isActive ? 'تم تفعيل الشخص' : 'تم إلغاء تفعيل الشخص',
        })
    } catch (error) {
        console.error('API Error [PATCH /persons/id/toggle]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
