'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { ProductAttributeFormData } from '@/lib/types/product-attribute'

const PATHS = '/product-attributes'

const CODE_REGEX = /^[A-Za-z0-9_]{2,20}$/

function normalizeCode(code: string): string {
    return code.trim().toLowerCase()
}

function normalizeExamples(examples?: string[] | null): string[] {
    if (!examples?.length) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of examples) {
        const value = raw.trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        out.push(value)
    }
    return out
}

function validatePayload(data: ProductAttributeFormData): {
    code: string
    name: string
    examples: string[]
} {
    const code = normalizeCode(data.code)
    if (!CODE_REGEX.test(code)) {
        throw new Error('الكود يجب أن يكون 2–20 حرفاً (إنجليزي أو أرقام أو _)')
    }
    if (data.name.trim().length < 2) {
        throw new Error('الاسم يجب أن يكون حرفين على الأقل')
    }
    return {
        code,
        name: data.name.trim(),
        examples: normalizeExamples(data.examples),
    }
}

function serializeAttribute(row: {
    id: string
    code: string
    name: string
    examples: unknown
    createdAt: Date
    updatedAt: Date
    _count?: { values: number }
}) {
    const examples = Array.isArray(row.examples)
        ? row.examples.filter((x): x is string => typeof x === 'string')
        : []
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        examples,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        valuesCount: row._count?.values,
    }
}

export async function getProductAttributes() {
    return safeAction(
        async () => {
            await requireAuth()
            const rows = await prisma.productAttribute.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { values: true } } },
            })
            return rows.map(serializeAttribute)
        },
        'تعذّر جلب صفات المنتج'
    )
}

export async function getProductAttributeById(id: string) {
    return safeAction(
        async () => {
            await requireAuth()
            const row = await prisma.productAttribute.findUnique({
                where: { id },
                include: { _count: { select: { values: true } } },
            })
            return row ? serializeAttribute(row) : null
        },
        'تعذّر جلب الصفة'
    )
}

export async function createProductAttribute(data: ProductAttributeFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validatePayload(data)
            const row = await prisma.productAttribute.create({
                data: {
                    code: payload.code,
                    name: payload.name,
                    examples: payload.examples,
                },
                include: { _count: { select: { values: true } } },
            })
            return serializeAttribute(row)
        },
        PATHS,
        'تعذّر إنشاء الصفة'
    )
}

export async function updateProductAttribute(id: string, data: ProductAttributeFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const payload = validatePayload(data)
            const row = await prisma.productAttribute.update({
                where: { id },
                data: {
                    code: payload.code,
                    name: payload.name,
                    examples: payload.examples,
                },
                include: { _count: { select: { values: true } } },
            })
            return serializeAttribute(row)
        },
        PATHS,
        'تعذّر تعديل الصفة'
    )
}

export async function deleteProductAttribute(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const attribute = await prisma.productAttribute.findUnique({
                where: { id },
                include: { _count: { select: { values: true } } },
            })
            if (!attribute) {
                throw Object.assign(new Error('الصفة غير موجودة'), { code: 'P2025' })
            }
            if (attribute._count.values > 0) {
                throw new Error('لا يمكن حذف صفة مرتبطة بمنتجات')
            }
            await prisma.productAttribute.delete({ where: { id } })
            return serializeAttribute(attribute)
        },
        PATHS,
        'تعذّر حذف الصفة'
    )
}
