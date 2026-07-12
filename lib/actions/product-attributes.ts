'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { ProductAttributeFormData } from '@/lib/types/product-attribute'

const PATHS = '/product-attributes'

const CODE_REGEX = /^[A-Z0-9_]{2,10}$/

function normalizeCode(code: string): string {
    return code.trim().toUpperCase()
}

function validatePayload(data: ProductAttributeFormData): void {
    const code = normalizeCode(data.code)
    if (!CODE_REGEX.test(code)) {
        throw new Error('الكود يجب أن يكون 2–10 أحرف إنجليزية أو أرقام أو _')
    }
    if (data.name.trim().length < 2) {
        throw new Error('الاسم يجب أن يكون حرفين على الأقل')
    }
}

export async function getProductAttributes() {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.productAttribute.findMany({
                orderBy: { name: 'asc' },
            })
        },
        'تعذّر جلب خصائص المنتجات'
    )
}

export async function getProductAttributeById(id: string) {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.productAttribute.findUnique({ where: { id } })
        },
        'تعذّر جلب الخاصية'
    )
}

export async function createProductAttribute(data: ProductAttributeFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            validatePayload(data)
            const code = normalizeCode(data.code)
            return prisma.productAttribute.create({
                data: {
                    code,
                    name: data.name.trim(),
                    description: data.description?.trim() || null,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء الخاصية'
    )
}

export async function updateProductAttribute(id: string, data: ProductAttributeFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            validatePayload(data)
            const code = normalizeCode(data.code)
            return prisma.productAttribute.update({
                where: { id },
                data: {
                    code,
                    name: data.name.trim(),
                    description: data.description?.trim() || null,
                },
            })
        },
        PATHS,
        'تعذّر تعديل الخاصية'
    )
}

export async function deleteProductAttribute(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            const attribute = await prisma.productAttribute.findUnique({ where: { id } })
            if (!attribute) {
                throw Object.assign(new Error('الخاصية غير موجودة'), { code: 'P2025' })
            }
            await prisma.productAttribute.delete({ where: { id } })
            return attribute
        },
        PATHS,
        'تعذّر حذف الخاصية'
    )
}
