import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import {
    parseProductSearchQuery,
    searchProducts,
    handleBotServiceError,
} from '@/lib/bot'

// GET /api/v1/bot/products/search?q=
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = parseProductSearchQuery(searchParams)
        const { results, meta } = await searchProducts(query)
        return apiSuccess(results, 200, { ...meta })
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /products/search]')
    }
}
