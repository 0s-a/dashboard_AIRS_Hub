import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BotServiceError } from './errors'
import { resolveProductDisplayName } from '@/lib/utils/product-display-name'

export const ProductRefSchema = z
    .object({
        productId: z.string().min(1).optional(),
        itemNumber: z.string().min(1).optional(),
    })
    .refine(data => !!(data.productId?.trim() || data.itemNumber?.trim()), {
        message: 'يجب تمرير productId أو itemNumber',
    })

export type ProductRefInput = z.infer<typeof ProductRefSchema>

const productRefSelect = {
    id: true,
    itemNumber: true,
    name: true,
    inheritsFamilyName: true,
    family: { select: { name: true } },
} as const

export type ResolvedProduct = {
    id: string
    itemNumber: string
    name: string
    displayName: string
}

/**
 * Resolve a product by UUID or unique itemNumber.
 * When both are provided, productId takes precedence.
 */
export async function resolveProductRef(
    input: ProductRefInput
): Promise<ResolvedProduct> {
    const productId = input.productId?.trim()
    const itemNumber = input.itemNumber?.trim()

    const product = productId
        ? await prisma.product.findUnique({
              where: { id: productId },
              select: productRefSelect,
          })
        : await prisma.product.findUnique({
              where: { itemNumber: itemNumber! },
              select: productRefSelect,
          })

    if (!product) {
        throw new BotServiceError('المنتج غير موجود', 404, 'NOT_FOUND')
    }

    return {
        id: product.id,
        itemNumber: product.itemNumber,
        name: product.name,
        displayName: resolveProductDisplayName(product),
    }
}
