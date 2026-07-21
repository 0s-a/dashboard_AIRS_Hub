import { prisma } from '@/lib/prisma'
import { BotServiceError } from './errors'
import {
    ProductRefSchema,
    resolveProductRef,
    type ProductRefInput,
} from './resolve-product'

export const ProductImageQuerySchema = ProductRefSchema

export type ProductImageQuery = ProductRefInput

/** Parse image query params; throws BotServiceError on validation failure. */
export function parseProductImageQuery(searchParams: URLSearchParams) {
    const parsed = ProductImageQuerySchema.safeParse({
        productId: searchParams.get('productId') ?? undefined,
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

export async function getProductPrimaryImage(input: ProductImageQuery) {
    const product = await resolveProductRef(input)

    const image = await prisma.productImage.findFirst({
        where: { productId: product.id },
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        select: {
            url: true,
            alt: true,
        },
    })

    if (!image) {
        throw new BotServiceError('لا توجد صورة للمنتج', 404, 'NOT_FOUND')
    }

    return {
        productId: product.id,
        itemNumber: product.itemNumber,
        url: image.url,
        alt: image.alt,
    }
}
