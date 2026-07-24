import { z } from 'zod'
import { contactsArraySchema } from '@/lib/config/contact.config'
import {
    absentToUndefined,
    nullishString,
    nullishUuid,
} from '@/lib/zod-optional'

// Re-export contact types from the central config
export type { ContactInput } from '@/lib/config/contact.config'
export { contactSchema, contactsArraySchema } from '@/lib/config/contact.config'

// ── Source enum ──────────────────────────────────────────────────────────────

const sourcePreprocess = (val: unknown) => {
    const v = absentToUndefined(val)
    if (v === undefined) return undefined
    const s = String(v).toLowerCase()
    return (['bot', 'manual', 'import', 'api'] as const).includes(s as never)
        ? s
        : undefined
}

const optionalEnum = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess(absentToUndefined, schema)

const optionalStringArray = z.preprocess(
    absentToUndefined,
    z.array(z.string()).optional()
)

// ── Create schema (POST /customers — upsert) ─────────────────────────────────

export const createCustomerSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    type: optionalEnum(z.enum(['customer', 'supervisor']).optional()),
    notes: nullishString,
    source: z.preprocess(
        sourcePreprocess,
        z.enum(['bot', 'manual', 'import', 'api']).nullable().optional()
    ),
    contacts: z.preprocess(absentToUndefined, contactsArraySchema.optional()),
    tags: optionalStringArray,
    currencyIds: optionalStringArray,
    priceLabelId: nullishUuid,
})

// ── Update schema (PUT /customers/[id]) ──────────────────────────────────────

export const updateCustomerSchema = z.object({
    name: optionalEnum(z.string().min(1, 'الاسم مطلوب').optional()),
    type: optionalEnum(z.enum(['customer', 'supervisor']).optional()),
    notes: nullishString,
    source: z.preprocess(
        sourcePreprocess,
        z.enum(['bot', 'manual', 'import', 'api']).nullable().optional()
    ),
    contacts: z.preprocess(absentToUndefined, contactsArraySchema.optional()),
    tags: optionalStringArray,
    currencyIds: optionalStringArray,
    priceLabelId: nullishUuid,
})
