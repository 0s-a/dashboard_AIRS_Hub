'use server'

/**
 * lib/actions/message-templates.ts
 *
 * CRUD server actions for MessageTemplate model.
 * Templates are reusable across multiple announcements.
 */

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { DEFAULT_TEXT_TEMPLATE, DEFAULT_IMAGE_TEMPLATE } from '@/lib/utils/message-builder'

const PATHS = '/announcements'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateInput {
    name:         string
    type:         'text' | 'text_image'
    sendMode?:    'combined' | 'per_product'
    bodyTemplate: string
    productBlock: string
    separator?:   string
    isDefault?:   boolean
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMessageTemplates() {
    return safeAction(
        () => prisma.messageTemplate.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { announcements: true } } },
        }),
        'تعذّر جلب القوالب'
    )
}

export async function getMessageTemplate(id: string) {
    return safeAction(
        () => prisma.messageTemplate.findUnique({ where: { id } }),
        'تعذّر جلب القالب'
    )
}

export async function getDefaultTemplate() {
    return safeAction(
        () => prisma.messageTemplate.findFirst({ where: { isDefault: true } }),
        'تعذّر جلب القالب الافتراضي'
    )
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMessageTemplate(data: TemplateInput) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        // If this template is default, unset any existing defaults
        if (data.isDefault) {
            await prisma.messageTemplate.updateMany({
                where: { isDefault: true },
                data:  { isDefault: false },
            })
        }

        return prisma.messageTemplate.create({
            data: {
                name:         data.name.trim(),
                type:         data.type,
                sendMode:     data.sendMode ?? 'combined',
                bodyTemplate: data.bodyTemplate,
                productBlock: data.productBlock,
                separator:    data.separator ?? '\n---\n',
                isDefault:    data.isDefault ?? false,
            },
        })
    }, PATHS, 'تعذّر إنشاء القالب')
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMessageTemplate(id: string, data: Partial<TemplateInput>) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        if (data.isDefault) {
            await prisma.messageTemplate.updateMany({
                where: { isDefault: true, id: { not: id } },
                data:  { isDefault: false },
            })
        }

        const updateData: any = {}
        if (data.name         !== undefined) updateData.name         = data.name.trim()
        if (data.type         !== undefined) updateData.type         = data.type
        if (data.sendMode     !== undefined) updateData.sendMode     = data.sendMode
        if (data.bodyTemplate !== undefined) updateData.bodyTemplate = data.bodyTemplate
        if (data.productBlock !== undefined) updateData.productBlock = data.productBlock
        if (data.separator    !== undefined) updateData.separator    = data.separator
        if (data.isDefault    !== undefined) updateData.isDefault    = data.isDefault

        return prisma.messageTemplate.update({ where: { id }, data: updateData })
    }, PATHS, 'تعذّر تحديث القالب')
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMessageTemplate(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        // Check if template is in use
        const usageCount = await prisma.announcement.count({ where: { templateId: id } })
        if (usageCount > 0) {
            throw new Error(`لا يمكن حذف القالب — مستخدم في ${usageCount} إعلان`)
        }

        await prisma.messageTemplate.delete({ where: { id } })
        return null
    }, PATHS, 'تعذّر حذف القالب')
}

// ─── Seed Defaults ────────────────────────────────────────────────────────────

/**
 * Creates the two default templates if no templates exist yet.
 * Called automatically from the announcement sheet when templates list is empty.
 */
export async function seedDefaultTemplates() {
    return safeAction(async () => {
        const count = await prisma.messageTemplate.count()
        if (count > 0) return { seeded: false }

        await prisma.messageTemplate.createMany({
            data: [
                {
                    name:         DEFAULT_TEXT_TEMPLATE.name,
                    type:         DEFAULT_TEXT_TEMPLATE.type,
                    sendMode:     DEFAULT_TEXT_TEMPLATE.sendMode,
                    bodyTemplate: DEFAULT_TEXT_TEMPLATE.bodyTemplate,
                    productBlock: DEFAULT_TEXT_TEMPLATE.productBlock,
                    separator:    DEFAULT_TEXT_TEMPLATE.separator,
                    isDefault:    true,
                },
                {
                    name:         DEFAULT_IMAGE_TEMPLATE.name,
                    type:         DEFAULT_IMAGE_TEMPLATE.type,
                    sendMode:     DEFAULT_IMAGE_TEMPLATE.sendMode,
                    bodyTemplate: DEFAULT_IMAGE_TEMPLATE.bodyTemplate,
                    productBlock: DEFAULT_IMAGE_TEMPLATE.productBlock,
                    separator:    DEFAULT_IMAGE_TEMPLATE.separator,
                    isDefault:    false,
                },
            ],
        })

        return { seeded: true }
    }, 'تعذّر إنشاء القوالب الافتراضية')
}
