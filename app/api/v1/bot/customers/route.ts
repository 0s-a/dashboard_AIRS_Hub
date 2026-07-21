import { NextRequest } from 'next/server'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'
import {
    createCustomerSchema,
    upsertCustomer,
    handleCustomerServiceError,
} from '@/lib/customers'

// POST /api/v1/bot/customers — Create or Update (Upsert) a customer
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const rawBody = await req.json()
        const validationResult = createCustomerSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return apiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: validationResult.error.format(),
            })
        }

        const { customer, action } = await upsertCustomer(validationResult.data)
        return apiSuccess(customer, action === 'created' ? 201 : 200, { action })
    } catch (error) {
        console.error('[Bot POST /customers]', error)
        return handleCustomerServiceError(error)
    }
}
