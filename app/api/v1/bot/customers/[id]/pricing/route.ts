import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import { getCustomerPricing, handleCustomerServiceError } from '@/lib/customers'

// GET /api/v1/bot/customers/[id]/pricing
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const pricing = await getCustomerPricing(id)
        return apiSuccess(pricing)
    } catch (error) {
        console.error('[Bot GET /customers/id/pricing]', error)
        return handleCustomerServiceError(error)
    }
}
