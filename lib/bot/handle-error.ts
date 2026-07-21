import { apiError } from '@/lib/api-utils'
import { BotServiceError } from './errors'

export function handleBotServiceError(error: unknown, logPrefix = '[Bot]') {
    if (error instanceof BotServiceError) {
        return apiError(error.message, error.status, {
            code: error.code,
            ...(error.details !== undefined && { details: error.details }),
        })
    }
    console.error(logPrefix, error)
    return apiError('خطأ داخلي في الخادم', 500, { code: 'INTERNAL_ERROR' })
}
