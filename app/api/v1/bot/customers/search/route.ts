import { NextRequest } from 'next/server'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'
import { searchCustomerByPhone, handleCustomerServiceError } from '@/lib/customers'

// GET /api/v1/bot/customers/search?phone=xxx
// Aliases: q, value
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const raw =
            searchParams.get('phone') ||
            searchParams.get('q') ||
            searchParams.get('value')

        if (!raw || !raw.trim()) {
            return apiError('يجب تمرير رقم الهاتف عبر المعامل phone', 400, {
                code: 'MISSING_PHONE',
            })
        }

        const result = await searchCustomerByPhone(raw)
        return apiSuccess(result.data, 200, {
            found: result.found,
            meta: result.meta,
        })
    } catch (error) {
        console.error('[Bot GET /customers/search]', error)
        return handleCustomerServiceError(error)
    }
}
