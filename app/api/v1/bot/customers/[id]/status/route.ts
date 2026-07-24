import { NextRequest } from 'next/server'
import { validateApiKey, botApiError, apiSuccess } from '@/lib/api-utils'
import {
    CustomerStatusSchema,
    setCustomerStatus,
    handleCustomerServiceError,
} from '@/lib/customers'

// PATCH /api/v1/bot/customers/[id]/status
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const body = await req.json()
        const parsed = CustomerStatusSchema.safeParse(body)
        if (!parsed.success) {
            return botApiError(
                'البيانات غير صالحة - يجب تمرير isActive كقيمة منطقية',
                400,
                { code: 'VALIDATION_ERROR' }
            )
        }

        const { customer, message } = await setCustomerStatus(id, parsed.data.isActive)
        return apiSuccess(customer, 200, { message })
    } catch (error) {
        console.error('[Bot PATCH /customers/id/status]', error)
        return handleCustomerServiceError(error)
    }
}
