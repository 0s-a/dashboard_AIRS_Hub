import { z } from 'zod'
import { contactsArraySchema } from '@/lib/config/contact.config'

// Re-export contact types from the central config
export type { ContactInput } from '@/lib/config/contact.config'
export { contactSchema, contactsArraySchema } from '@/lib/config/contact.config'

// ── Source enum ──────────────────────────────────────────────────────────────

const sourcePreprocess = (val: unknown) => {
    if (!val || val === '') return undefined
    const s = String(val).toLowerCase()
    return (['bot', 'manual', 'import', 'api'] as const).includes(s as never) ? s : undefined
}

// ── Create schema (POST /customers — upsert) ─────────────────────────────────

export const createCustomerSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    type: z.enum(['customer', 'supervisor']).optional(),
    notes: z.string().nullable().optional(),
    source: z.preprocess(
        sourcePreprocess,
        z.enum(['bot', 'manual', 'import', 'api']).nullable().optional()
    ),
    contacts: contactsArraySchema.optional(),
    tags: z.array(z.string()).optional(),
    currencyIds: z.array(z.string()).optional(),

    priceLabelId: z.string().nullable().optional(),
})


// ── Update schema (PUT /customers/[id]) ──────────────────────────────────────

export const updateCustomerSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب').optional(),
    type: z.enum(['customer', 'supervisor']).optional(),
    notes: z.string().nullable().optional(),
    source: z.preprocess(
        sourcePreprocess,
        z.enum(['bot', 'manual', 'import', 'api']).nullable().optional()
    ),
    contacts: contactsArraySchema.optional(),
    tags: z.array(z.string()).optional(),
    currencyIds: z.array(z.string()).optional(),

    priceLabelId: z.string().nullable().optional(),
})
