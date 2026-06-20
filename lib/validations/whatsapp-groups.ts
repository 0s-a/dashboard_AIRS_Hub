import { z } from 'zod'

// ── WhatsApp Groups — Zod Validation Schemas ───────────────────────

export const whatsappGroupSchema = z.object({
    name: z
        .string()
        .max(100, 'الاسم طويل جداً')
        .optional(),

    groupNumber: z
        .string()
        .max(60, 'رقم المجموعة طويل جداً')
        .nullable()
        .optional(),

    notes: z
        .string()
        .max(500, 'الملاحظات طويلة جداً')
        .nullable()
        .optional(),

    isActive: z.boolean(),

    customerId: z
        .string()
        .min(1, 'يجب اختيار عميل'),

    supervisorIds: z
        .array(z.string())
        .min(1, 'يجب إضافة مشرف واحد على الأقل'),
})

export const updateWhatsappGroupSchema = whatsappGroupSchema.partial().extend({
    supervisorIds: z.array(z.string()).optional(),
})

export type WhatsappGroupInput   = z.infer<typeof whatsappGroupSchema>
export type UpdateWhatsappGroupInput = z.infer<typeof updateWhatsappGroupSchema>
