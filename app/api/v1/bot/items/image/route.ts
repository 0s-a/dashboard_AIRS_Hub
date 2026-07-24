import { NextRequest } from 'next/server'
import { validateApiKey, apiSuccess } from '@/lib/api-utils'
import {
    parseItemImageQuery,
    getItemPrimaryImage,
    handleBotServiceError,
} from '@/lib/bot'

// GET /api/v1/bot/items/image?itemId=|itemNumber=
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = parseItemImageQuery(searchParams)
        const result = await getItemPrimaryImage(query)
        return apiSuccess(result)
    } catch (error) {
        return handleBotServiceError(error, '[Bot GET /items/image]')
    }
}
