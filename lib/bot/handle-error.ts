import { botApiError } from '@/lib/api-utils'
import { BotServiceError } from './errors'

export function handleBotServiceError(error: unknown, logPrefix = '[Bot]') {
    if (error instanceof BotServiceError) {
        return botApiError(error.message, error.status, {
            code: error.code,
            ...(error.details !== undefined && { details: error.details }),
        })
    }
    console.error(logPrefix, error)
    return botApiError('خطأ داخلي في الخادم', 500, { code: 'INTERNAL_ERROR' })
}
