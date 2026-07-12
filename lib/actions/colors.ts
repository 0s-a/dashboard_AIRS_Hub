'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import { COLOR_CODE_CONFIG, HEX_CODE_CONFIG } from '@/lib/config/color.config'
import type { ColorFormData } from '@/lib/types/color'

const PATHS = '/colors'

function normalizeCode(code: string): string {
    return code.trim().toUpperCase()
}

function normalizeHex(hex: string): string {
    const trimmed = hex.trim().toUpperCase()
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function validatePayload(data: ColorFormData): { code: string; name: string; hexCode: string } {
    const code = normalizeCode(data.code)
    if (
        code.length < COLOR_CODE_CONFIG.minLength
        || code.length > COLOR_CODE_CONFIG.maxLength
        || !COLOR_CODE_CONFIG.regex.test(code)
    ) {
        throw new Error(
            `كود اللون يجب أن يكون ${COLOR_CODE_CONFIG.minLength}–${COLOR_CODE_CONFIG.maxLength} أحرف (إنجليزية أو أرقام)`
        )
    }
    if (data.name.trim().length < 2) {
        throw new Error('اسم اللون يجب أن يكون حرفين على الأقل')
    }
    const hexCode = normalizeHex(data.hexCode)
    if (!HEX_CODE_CONFIG.regex.test(hexCode)) {
        throw new Error('كود HEX غير صالح — استخدم صيغة #RRGGBB')
    }
    return { code, name: data.name.trim(), hexCode }
}

export async function getColors(activeOnly = false) {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.color.findMany({
                where: activeOnly ? { isActive: true } : undefined,
                orderBy: [{ order: 'asc' }, { name: 'asc' }],
            })
        },
        'تعذّر جلب الألوان'
    )
}

export async function getColorById(id: string) {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.color.findUnique({ where: { id } })
        },
        'تعذّر جلب اللون'
    )
}

export async function getColorByCode(code: string) {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.color.findUnique({ where: { code: normalizeCode(code) } })
        },
        'تعذّر جلب اللون'
    )
}

export async function createColor(data: ColorFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validatePayload(data)
            return prisma.color.create({
                data: {
                    code: payload.code,
                    name: payload.name,
                    hexCode: payload.hexCode,
                    order: data.order ?? 0,
                    isActive: data.isActive ?? true,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء اللون'
    )
}

export async function updateColor(id: string, data: ColorFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const existing = await prisma.color.findUnique({
                where: { id },
                include: { _count: { select: { skcs: true } } },
            })
            if (!existing) {
                throw Object.assign(new Error('اللون غير موجود'), { code: 'P2025' })
            }

            const payload = validatePayload(data)
            if (existing._count.skcs > 0 && payload.code !== existing.code) {
                throw new Error('لا يمكن تغيير كود اللون — مرتبط بأصناف')
            }

            return prisma.color.update({
                where: { id },
                data: {
                    code: payload.code,
                    name: payload.name,
                    hexCode: payload.hexCode,
                    order: data.order ?? existing.order,
                    isActive: data.isActive ?? existing.isActive,
                },
            })
        },
        PATHS,
        'تعذّر تعديل اللون'
    )
}

export async function deleteColor(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const color = await prisma.color.findUnique({
                where: { id },
                include: { _count: { select: { skcs: true } } },
            })
            if (!color) {
                throw Object.assign(new Error('اللون غير موجود'), { code: 'P2025' })
            }
            if (color._count.skcs > 0) {
                throw new Error('لا يمكن حذف لون مرتبط بأصناف')
            }
            await prisma.color.delete({ where: { id } })
            return color
        },
        PATHS,
        'تعذّر حذف اللون'
    )
}
