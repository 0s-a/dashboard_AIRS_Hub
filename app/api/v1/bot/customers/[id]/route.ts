import { NextRequest } from 'next/server'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'
import {
    updateCustomerSchema,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    handleCustomerServiceError,
} from '@/lib/customers'

// GET /api/v1/bot/customers/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const customer = await getCustomerById(id)
        return apiSuccess(customer)
    } catch (error) {
        console.error('[Bot GET /customers/id]', error)
        return handleCustomerServiceError(error)
    }
}

// PUT /api/v1/bot/customers/[id]
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const rawBody = await req.json()
        const validationResult = updateCustomerSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return apiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: validationResult.error.format(),
            })
        }

        const customer = await updateCustomer(id, validationResult.data)
        return apiSuccess(customer)
    } catch (error) {
        console.error('[Bot PUT /customers/id]', error)
        return handleCustomerServiceError(error)
    }
}

// DELETE /api/v1/bot/customers/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { id } = await params
        const result = await deleteCustomer(id)
        return apiSuccess(null, 200, result)
    } catch (error) {
        console.error('[Bot DELETE /customers/id]', error)
        return handleCustomerServiceError(error)
    }
}
