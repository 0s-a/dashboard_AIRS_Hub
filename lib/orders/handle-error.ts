import { apiError } from '@/lib/api-utils'
import { OrderServiceError } from './errors'

export function handleOrderServiceError(error: unknown) {
    if (error instanceof OrderServiceError) {
        return apiError(error.message, error.status, {
            code: error.code,
            ...(error.details !== undefined && { details: error.details }),
        })
    }
    console.error('[Orders API]', error)
    return apiError('خطأ داخلي في الخادم', 500, { code: 'INTERNAL_ERROR' })
}
