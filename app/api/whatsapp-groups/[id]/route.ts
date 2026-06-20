import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
    groupNumber: z.string().max(60).nullable().optional(),
    isActive: z.preprocess((val) => {
        if (typeof val === 'string') return val === 'true';
        return val;
    }, z.boolean()).optional(),
})

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const apiKey = request.headers.get('x-api-key')
        
        // التحقق من مفتاح الحماية
        if (!apiKey || apiKey !== process.env.BOT_API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resolvedParams = await params
        const id = resolvedParams.id
        const body = await request.json()
        
        // التحقق من صحة البيانات المُدخلة
        const parsed = updateSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: parsed.error.format() }, 
                { status: 400 }
            )
        }

        const data = parsed.data

        // التحقق من وجود المجموعة
        const existingGroup = await prisma.whatsappGroup.findUnique({
            where: { id }
        })

        if (!existingGroup) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 })
        }

        // التحديث في قاعدة البيانات
        const updatedGroup = await prisma.whatsappGroup.update({
            where: { id },
            data: {
                ...(data.groupNumber !== undefined && { groupNumber: data.groupNumber }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            }
        })

        return NextResponse.json({ success: true, data: updatedGroup }, { status: 200 })

    } catch (error: any) {
        console.error('[API_WHATSAPP_GROUP_UPDATE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
