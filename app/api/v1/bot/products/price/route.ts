import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import {
    parseProductPriceQuery,
    getProductPrice,
    handleBotServiceError,
} from '@/lib/bot'

// GET /api/v1/bot/products/price?productId=|itemNumber=&customerId=&currency=
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = parseProductPriceQuery(searchParams)
        const result = await getProductPrice(query)
        return apiSuccess(result)
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /products/price]')
    }
}
