import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import {
    parseItemByNumberQuery,
    getItemByNumber,
    handleBotServiceError,
} from '@/lib/bot'

// GET /api/v1/bot/items/by-number?itemNumber=&customerId=&currency=
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = parseItemByNumberQuery(searchParams)
        const result = await getItemByNumber(query)
        return apiSuccess(result)
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /items/by-number]')
    }
}
