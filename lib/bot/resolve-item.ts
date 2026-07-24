import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BotServiceError } from './errors'
import { optionalString } from '@/lib/zod-optional'

export const ItemRefSchema = z
    .object({
        itemId: optionalString,
        itemNumber: optionalString,
    })
    .refine(data => !!(data.itemId?.trim() || data.itemNumber?.trim()), {
        message: 'يجب تمرير itemId أو itemNumber',
    })

export type ItemRefInput = z.infer<typeof ItemRefSchema>

const itemRefSelect = {
    id: true,
    itemNumber: true,
    name: true,
} as const

export type ResolvedItem = {
    id: string
    itemNumber: string
    name: string
}

/**
 * Resolve a sellable Item (SKU) by UUID or unique itemNumber.
 * When both are provided, itemId takes precedence.
 */
export async function resolveItemRef(
    input: ItemRefInput
): Promise<ResolvedItem> {
    const itemId = input.itemId?.trim()
    const itemNumber = input.itemNumber?.trim()

    const item = itemId
        ? await prisma.item.findUnique({
              where: { id: itemId },
              select: itemRefSelect,
          })
        : await prisma.item.findUnique({
              where: { itemNumber: itemNumber! },
              select: itemRefSelect,
          })

    if (!item) {
        throw new BotServiceError('الصنف غير موجود', 404, 'NOT_FOUND')
    }

    return {
        id: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
    }
}
