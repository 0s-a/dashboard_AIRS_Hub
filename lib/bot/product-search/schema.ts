import { z } from 'zod'
import { BotServiceError } from '../errors'
import {
    absentToUndefined,
    optionalIntParam,
    optionalTrimmedString,
} from '@/lib/zod-optional'

const availableQueryParam = z.preprocess((val) => {
    const v = absentToUndefined(val)
    if (v === undefined) return undefined
    if (v === true || v === 'true' || v === '1') return true
    if (v === false || v === 'false' || v === '0') return false
    return v
}, z.boolean().optional())

const parseQueryParam = z.preprocess((val) => {
    const v = absentToUndefined(val)
    if (v === undefined) return true
    if (v === true || v === 'true' || v === '1') return true
    if (v === false || v === 'false' || v === '0') return false
    return v
}, z.boolean())

export const ProductSearchQuerySchema = z.object({
    q: z.string().trim().min(1, 'يجب تمرير معامل البحث q'),
    brand: optionalTrimmedString,
    /** Repeated query params: ?attr=أحمر&attr=L — AND between values */
    attr: z.array(z.string().trim().min(1)).default([]),
    available: availableQueryParam,
    /** When false, skip high-confidence parse of q into brand/attr */
    parse: parseQueryParam.default(true),
    /** Optional Product (SPU) code filter */
    productCode: optionalTrimmedString,
    /** Optional — customer price label + currencies for embedded prices */
    customerId: optionalTrimmedString,
    /** Optional — force currency code for embedded prices */
    currency: optionalTrimmedString,
    page: optionalIntParam(1, { min: 1 }),
    limit: optionalIntParam(20, { min: 1, max: 50 }),
})

export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>

/** Parse search query params; throws BotServiceError on validation failure. */
export function parseProductSearchQuery(searchParams: URLSearchParams) {
    const parsed = ProductSearchQuerySchema.safeParse({
        q: searchParams.get('q') ?? undefined,
        brand: searchParams.get('brand') ?? undefined,
        attr: searchParams
            .getAll('attr')
            .map(v => v.trim())
            .filter(v => v && !/^null$/i.test(v) && !/^undefined$/i.test(v)),
        available: searchParams.get('available') ?? undefined,
        parse: searchParams.get('parse') ?? undefined,
        productCode: searchParams.get('productCode') ?? undefined,
        customerId: searchParams.get('customerId') ?? undefined,
        currency: searchParams.get('currency') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
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
