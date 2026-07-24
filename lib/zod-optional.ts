import { z } from 'zod'

/**
 * Treat null / blank / "null" / "undefined" as absent (undefined).
 * Lets n8n and bots pass null on optional query/body fields without VALIDATION_ERROR.
 */
export function absentToUndefined(val: unknown): unknown {
    if (val === null || val === undefined) return undefined
    if (typeof val === 'string') {
        const t = val.trim()
        if (!t || /^null$/i.test(t) || /^undefined$/i.test(t)) return undefined
        return t
    }
    return val
}

/** Optional non-empty string; null/""/"null" → undefined */
export const optionalString = z.preprocess(
    absentToUndefined,
    z.string().min(1).optional()
)

/** Optional trimmed non-empty string */
export const optionalTrimmedString = z.preprocess(
    absentToUndefined,
    z.string().trim().min(1).optional()
)

/** Optional UUID; null/""/"null" → undefined */
export const optionalUuid = z.preprocess(
    absentToUndefined,
    z.string().uuid().optional()
)

/**
 * Optional UUID that may be explicitly null in JSON bodies
 * (e.g. clear customerId). String "null" → null.
 */
export function absentToNullish(val: unknown): unknown {
    if (val === undefined) return undefined
    if (val === null) return null
    if (typeof val === 'string') {
        const t = val.trim()
        if (!t || /^null$/i.test(t) || /^undefined$/i.test(t)) return null
        return t
    }
    return val
}

export const nullishUuid = z.preprocess(
    absentToNullish,
    z.string().uuid().nullable().optional()
)

export const nullishString = z.preprocess(
    absentToNullish,
    z.string().nullable().optional()
)

/** Optional int query/body param; null/"null"/"" → default */
export function optionalIntParam(
    defaultValue: number,
    opts?: { min?: number; max?: number }
) {
    const min = opts?.min ?? 1
    let schema = z.number().int().min(min)
    if (opts?.max !== undefined) {
        schema = schema.max(opts.max)
    }
    return z
        .union([z.number(), z.string(), z.null(), z.undefined()])
        .transform(val => {
            const v = absentToUndefined(val)
            if (v === undefined) return defaultValue
            return typeof v === 'number' ? v : Number(v)
        })
        .pipe(schema)
}
