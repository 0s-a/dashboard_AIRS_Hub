import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// PATCH /api/v1/bot/customers/[id]/status — Update customer status (activate/deactivate)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const body = await req.json()

        if (typeof body.isActive !== 'boolean') {
            return apiError('البيانات غير صالحة - يجب تمرير isActive كقيمة منطقية', 400, { code: 'VALIDATION_ERROR' })
        }

        const existing = await prisma.customer.findUnique({
            where: { id },
            select: { id: true, isActive: true, name: true },
        })

        if (!existing) return apiError('العميل غير موجود', 404, { code: 'NOT_FOUND' })

        if (existing.isActive === body.isActive) {
            return apiSuccess(existing, 200, {
                message: body.isActive ? 'العميل مفعل مسبقاً' : 'العميل معطل مسبقاً',
            })
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: { isActive: body.isActive },
            select: { id: true, name: true, isActive: true },
        })

        return apiSuccess(customer, 200, {
            message: body.isActive ? 'تم تفعيل العميل بنجاح' : 'تم تعطيل العميل بنجاح',
        })
    } catch (error) {
        console.error('API Error [PATCH /customers/id/status]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
