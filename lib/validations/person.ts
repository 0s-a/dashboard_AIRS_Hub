import { z } from 'zod'

// ── Contact sub-schemas (discriminated by type) ───────────────────────────────

const contactBaseFields = {
    label: z.string().nullable().optional(),
    isPrimary: z.boolean().default(false),
}

const phoneContactSchema = z.object({
    type: z.literal('phone'),
    value: z.string()
        .min(1, 'رقم الهاتف مطلوب')
        .regex(/^\+?\d{7,15}$/, 'رقم الهاتف يجب أن يحتوي 7-15 رقماً (بدون مسافات أو رموز)'),
    ...contactBaseFields,
})

const emailContactSchema = z.object({
    type: z.literal('email'),
    value: z.string()
        .min(1, 'البريد الإلكتروني مطلوب')
        .email('البريد الإلكتروني غير صالح'),
    ...contactBaseFields,
})

const whatsappContactSchema = z.object({
    type: z.literal('whatsapp'),
    value: z.string()
        .min(1, 'رقم الواتساب مطلوب')
        .regex(/^\+?\d{7,15}$/, 'رقم الواتساب يجب أن يحتوي 7-15 رقماً (بدون مسافات أو رموز)'),
    ...contactBaseFields,
})

export const contactSchema = z.discriminatedUnion('type', [
    phoneContactSchema,
    emailContactSchema,
    whatsappContactSchema,
])

// Inferred type — single source of truth (used in person-types.ts too)
export type ContactInput = z.infer<typeof contactSchema>

// ── Contacts array with duplicate detection ──────────────────────────────────

const contactsArraySchema = z.array(contactSchema).superRefine((contacts, ctx) => {
    const seen = new Map<string, number>()
    contacts.forEach((c, i) => {
        const key = `${c.type}:${c.value.trim()}`
        if (seen.has(key)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [i, 'value'],
                message: 'هذا الرقم/البريد مكرر في القائمة',
            })
        } else {
            seen.set(key, i)
        }
    })
})

// ── Source enum ──────────────────────────────────────────────────────────────

const sourcePreprocess = (val: unknown) => {
    if (!val || val === '') return undefined
    const s = String(val).toLowerCase()
    return (['bot', 'manual', 'import', 'api'] as const).includes(s as never) ? s : undefined
}

// ── Create schema (POST /persons — upsert) ───────────────────────────────────

export const createPersonSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    source: z.preprocess(
        sourcePreprocess,
        z.enum(['bot', 'manual', 'import', 'api']).nullable().optional()
    ),
    contacts: contactsArraySchema.optional(),
    tags: z.array(z.string()).optional(),
    currencyIds: z.array(z.string()).optional(),
    groupName: z.string().nullable().optional(),
    groupNumber: z.string().nullable().optional(),
    priceLabelIds: z.array(z.string()).optional(),
})

// ── Update schema (PUT /persons/[id]) ────────────────────────────────────────
// NOTE: isActive is intentionally excluded — use PATCH /activate or /deactivate instead.

export const updatePersonSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب').optional(),
    source: z.preprocess(
        sourcePreprocess,
        z.enum(['bot', 'manual', 'import', 'api']).nullable().optional()
    ),
    contacts: contactsArraySchema.optional(),
    tags: z.array(z.string()).optional(),
    currencyIds: z.array(z.string()).optional(),
    groupName: z.string().nullable().optional(),
    groupNumber: z.string().nullable().optional(),
    priceLabelIds: z.array(z.string()).optional(),
})
