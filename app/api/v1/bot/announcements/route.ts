import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-utils'

// GET /api/v1/bot/announcements — List sent announcements
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

        const announcements = await prisma.announcement.findMany({
            where: { status: 'sent' },
            orderBy: { sentAt: 'desc' },
            take: limit,
        })

        return NextResponse.json({ success: true, data: announcements, count: announcements.length })
    } catch (error) {
        console.error('API Error [GET /announcements]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
