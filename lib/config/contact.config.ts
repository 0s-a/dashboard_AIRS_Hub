/**
 * ─── Contact Information Configuration ─────────────────────
 * Central config for all contact types used across the system.
 *
 * Governs which contact types are available for Customers
 * (including type=supervisor) and any future entity that uses the Contact model.
 *
 * To add a new contact type:
 *   1. Add it to CONTACT_TYPES below
 *   2. Run `npx prisma generate` (no migration needed — type is a plain String)
 *   3. UI forms and validation schemas will pick it up automatically
 */

import { z } from 'zod'
import { canonicalizePhone } from '@/lib/phone-utils'

// ── Type Definitions ────────────────────────────────────────

export interface ContactTypeConfig {
    /** Unique key stored in the DB `Contact.type` column */
    key: string
    /** Arabic display label for UI */
    label: string
    /** Icon name (lucide-react) */
    icon: string
    /** Placeholder text shown in input fields */
    placeholder: string
    /** Regex pattern for validation (applied after preprocess/canonicalize) */
    pattern: RegExp
    /** Arabic error message when pattern fails */
    patternError: string
    /** Arabic label when value is required */
    requiredError: string
    /** Whether this type represents a phone-like number (for dial links, etc.) */
    isPhoneType: boolean
    /** Display order in dropdowns and forms */
    order: number
}

// ── Contact Types Registry ──────────────────────────────────

export const CONTACT_TYPES: readonly ContactTypeConfig[] = [
    {
        key: 'phone',
        label: 'هاتف',
        icon: 'Phone',
        placeholder: '0501234567',
        pattern: /^\d{7,15}$/,
        patternError: 'رقم الهاتف يجب أن يحتوي 7-15 رقماً (بدون مسافات أو رموز)',
        requiredError: 'رقم الهاتف مطلوب',
        isPhoneType: true,
        order: 1,
    },
    {
        key: 'whatsapp',
        label: 'واتساب',
        icon: 'MessageCircle',
        placeholder: '0501234567',
        pattern: /^\d{7,15}$/,
        patternError: 'رقم الواتساب يجب أن يحتوي 7-15 رقماً (بدون مسافات أو رموز)',
        requiredError: 'رقم الواتساب مطلوب',
        isPhoneType: true,
        order: 2,
    },
    {
        key: 'email',
        label: 'بريد إلكتروني',
        icon: 'Mail',
        placeholder: 'example@domain.com',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternError: 'البريد الإلكتروني غير صالح',
        requiredError: 'البريد الإلكتروني مطلوب',
        isPhoneType: false,
        order: 3,
    },
] as const

// ── Derived Helpers ─────────────────────────────────────────

/** All valid contact type keys — e.g. ['phone', 'whatsapp', 'email'] */
export const CONTACT_TYPE_KEYS = CONTACT_TYPES.map(t => t.key)

/** TypeScript union of valid type keys */
export type ContactTypeKey = (typeof CONTACT_TYPES)[number]['key']

/** Quick lookup map: key → config */
export const CONTACT_TYPE_MAP = Object.fromEntries(
    CONTACT_TYPES.map(t => [t.key, t])
) as Record<string, ContactTypeConfig>

/** Dropdown/select options sorted by display order */
export const CONTACT_TYPE_OPTIONS = [...CONTACT_TYPES]
    .sort((a, b) => a.order - b.order)
    .map(t => ({
        value: t.key,
        label: t.label,
        icon: t.icon,
    }))

/** Only phone-like types (for WhatsApp sending, dial links, etc.) */
export const PHONE_CONTACT_TYPES = CONTACT_TYPES.filter(t => t.isPhoneType)

/** Get config for a specific type key (or undefined) */
export function getContactTypeConfig(key: string): ContactTypeConfig | undefined {
    return CONTACT_TYPE_MAP[key]
}

/** Get label for a type key — returns the key itself as fallback */
export function getContactTypeLabel(key: string): string {
    return CONTACT_TYPE_MAP[key]?.label ?? key
}

/** Get icon name for a type key */
export function getContactTypeIcon(key: string): string {
    return CONTACT_TYPE_MAP[key]?.icon ?? 'Contact'
}

/**
 * Normalize a contact value for storage.
 * Phones → canonical digits; email → trim + lowercase; other → trim.
 */
export function normalizeContactValue(type: string, value: string): string | null {
    const config = CONTACT_TYPE_MAP[type]
    if (config?.isPhoneType) {
        return canonicalizePhone(value)
    }
    if (type === 'email') {
        const v = value.trim().toLowerCase()
        return v || null
    }
    const v = value.trim()
    return v || null
}

// ── Zod Schemas (auto-generated from config) ────────────────

/**
 * Build a Zod schema for a single contact type.
 * Used internally to construct the discriminated union.
 */
function buildContactTypeSchema(config: ContactTypeConfig) {
    const valueSchema = config.isPhoneType
        ? z
            .string()
            .min(1, config.requiredError)
            .transform((val, ctx) => {
                const canon = canonicalizePhone(val)
                if (!canon || !config.pattern.test(canon)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: config.patternError,
                    })
                    return z.NEVER
                }
                return canon
            })
        : config.key === 'email'
            ? z
                .string()
                .min(1, config.requiredError)
                .transform((val) => val.trim().toLowerCase())
                .pipe(z.string().regex(config.pattern, config.patternError))
            : z.string()
                .min(1, config.requiredError)
                .regex(config.pattern, config.patternError)

    return z.object({
        type: z.literal(config.key),
        value: valueSchema,
        label: z.string().nullable().optional(),
        isPrimary: z.boolean().default(false),
    })
}

/**
 * Discriminated union schema — auto-generated from CONTACT_TYPES.
 * Replaces the manually maintained schemas in validations/customer.ts
 */
export const contactSchema = z.discriminatedUnion(
    'type',
    CONTACT_TYPES.map(buildContactTypeSchema) as [
        ReturnType<typeof buildContactTypeSchema>,
        ReturnType<typeof buildContactTypeSchema>,
        ...ReturnType<typeof buildContactTypeSchema>[],
    ]
)

/** Inferred type — single source of truth */
export type ContactInput = z.infer<typeof contactSchema>

/**
 * Contacts array with strict uniqueness rules:
 *   1. No duplicate values — same phone/email cannot appear twice
 *   2. No duplicate types — only ONE contact per type (one phone, one whatsapp, one email)
 *   3. At most one isPrimary (transform assigns first phone if none)
 * Reusable in any customer form (عميل أو مشرف).
 */
export const contactsArraySchema = z
    .array(contactSchema)
    .superRefine((contacts, ctx) => {
        const seenValues = new Map<string, number>()
        const seenTypes = new Map<string, number>()
        const primaryIndices: number[] = []

        contacts.forEach((c, i) => {
            const val = c.value.trim()

            if (c.isPrimary) primaryIndices.push(i)

            if (seenValues.has(val)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [i, 'value'],
                    message: 'هذا الرقم/البريد مكرر في القائمة',
                })
            } else {
                seenValues.set(val, i)
            }

            if (seenTypes.has(c.type)) {
                const typeLabel = CONTACT_TYPE_MAP[c.type]?.label ?? c.type
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [i, 'type'],
                    message: `يمكن إضافة ${typeLabel} واحد فقط لكل شخص`,
                })
            } else {
                seenTypes.set(c.type, i)
            }
        })

        if (primaryIndices.length > 1) {
            primaryIndices.slice(1).forEach(i => {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [i, 'isPrimary'],
                    message: 'يمكن تعيين جهة اتصال أساسية واحدة فقط',
                })
            })
        }
    })
    .transform(ensureSinglePrimary)

/**
 * Ensure at most one isPrimary; if none set, mark first phone-type (or first) as primary.
 */
function ensureSinglePrimary<T extends { type: string; isPrimary?: boolean }>(
    contacts: T[]
): T[] {
    const primaryCount = contacts.filter(c => c.isPrimary).length
    if (primaryCount === 0 && contacts.length > 0) {
        const phoneIdx = contacts.findIndex(c => CONTACT_TYPE_MAP[c.type]?.isPhoneType)
        const idx = phoneIdx >= 0 ? phoneIdx : 0
        return contacts.map((c, i) => ({ ...c, isPrimary: i === idx }))
    }
    return contacts
}
