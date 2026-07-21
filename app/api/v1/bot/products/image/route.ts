import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import {
    parseProductImageQuery,
    getProductPrimaryImage,
    handleBotServiceError,
} from '@/lib/bot'

// GET /api/v1/bot/products/image?productId=|itemNumber=
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = parseProductImageQuery(searchParams)
        const result = await getProductPrimaryImage(query)
        return apiSuccess(result)
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /products/image]')
    }
}
