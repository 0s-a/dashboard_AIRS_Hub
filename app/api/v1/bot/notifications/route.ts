import { NextRequest } from 'next/server'
import { validateApiKey, botApiError, apiSuccess } from '@/lib/api-utils'
import {
    CreateNotificationSchema,
    createNotification,
    handleBotServiceError,
} from '@/lib/bot'

// POST /api/v1/bot/notifications
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const rawBody = await req.json().catch(() => null)
        if (rawBody === null || typeof rawBody !== 'object') {
            return botApiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
            })
        }

        const parsed = CreateNotificationSchema.safeParse(rawBody)
        if (!parsed.success) {
            return botApiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: parsed.error.flatten(),
            })
        }

        const result = await createNotification(parsed.data)
        return apiSuccess(result, result.created ? 201 : 200)
    } catch (error) {
        return handleBotServiceError(error, '[Bot POST /notifications]')
    }
}
