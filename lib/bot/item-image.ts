import { prisma } from '@/lib/prisma'
import { BotServiceError } from './errors'
import {
    ItemRefSchema,
    resolveItemRef,
    type ItemRefInput,
} from './resolve-item'

export const ItemImageQuerySchema = ItemRefSchema

export type ItemImageQuery = ItemRefInput

/** Parse image query params; throws BotServiceError on validation failure. */
export function parseItemImageQuery(searchParams: URLSearchParams) {
    const parsed = ItemImageQuerySchema.safeParse({
        itemId: searchParams.get('itemId') ?? undefined,
        itemNumber: searchParams.get('itemNumber') ?? undefined,
    })
    if (!parsed.success) {
        throw new BotServiceError(
            'البيانات غير صالحة',
            400,
            'VALIDATION_ERROR',
            parsed.error.flatten()
        )
    }
    return parsed.data
}

export async function getItemPrimaryImage(input: ItemImageQuery) {
    const item = await resolveItemRef(input)

    const image = await prisma.itemImage.findFirst({
        where: { itemId: item.id },
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        select: {
            url: true,
            alt: true,
        },
    })

    if (!image) {
        throw new BotServiceError('لا توجد صورة للصنف', 404, 'NOT_FOUND')
    }

    return {
        itemId: item.id,
        itemNumber: item.itemNumber,
        url: image.url,
        alt: image.alt,
    }
}
