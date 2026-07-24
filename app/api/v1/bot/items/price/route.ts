import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import {
    parseItemPriceQuery,
    getItemPrice,
    handleBotServiceError,
} from '@/lib/bot'

// GET /api/v1/bot/items/price?itemId=|itemNumber=&customerId=&currency=
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = parseItemPriceQuery(searchParams)
        const result = await getItemPrice(query)
        return apiSuccess(result)
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /items/price]')
    }
}
