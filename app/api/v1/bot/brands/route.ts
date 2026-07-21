import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import { listBrands, handleBotServiceError } from '@/lib/bot'

// GET /api/v1/bot/brands
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const brands = await listBrands()
        return apiSuccess(brands)
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /brands]')
    }
}
