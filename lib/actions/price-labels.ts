'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation, generateItemNumber } from '@/lib/action-utils'

const PATHS = '/price-labels'

export async function getPriceLabels() {
    return safeAction(
        () => prisma.priceLabel.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
        'تعذّر جلب مسميات التسعيرة'
    )
}

export async function getPriceLabelById(id: string) {
    return safeAction(
        () => prisma.priceLabel.findUnique({ where: { id } }),
        'تعذّر جلب مسمى التسعيرة'
    )
}

export async function createPriceLabel(data: {
    name: string
    itemNumber?: string
    notes?: string | null
    isDefault?: boolean
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                // Clear all existing defaults first
                await prisma.priceLabel.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            }
            const itemNumber = data.itemNumber?.trim() || await generateItemNumber('priceLabel')
            return prisma.priceLabel.create({
                data: {
                    name: data.name,
                    itemNumber,
                    notes: data.notes,
                    isDefault: data.isDefault ?? false,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء مسمى التسعيرة'
    )
}

export async function updatePriceLabel(id: string, data: {
    name?: string
    itemNumber?: string
    notes?: string | null
    isDefault?: boolean
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                // Clear all existing defaults, keep the one being updated
                await prisma.priceLabel.updateMany(
                    { where: { isDefault: true, id: { not: id } }, data: { isDefault: false } }
                )
            }
            return prisma.priceLabel.update({
                where: { id },
                data: {
                    ...(data.name       !== undefined && { name:       data.name       }),
                    ...(data.itemNumber !== undefined && { itemNumber: data.itemNumber  }),
                    ...(data.notes      !== undefined && { notes:      data.notes       }),
                    ...(data.isDefault  !== undefined && { isDefault:  data.isDefault   }),
                },
            })
        },
        PATHS,
        'تعذّر تعديل مسمى التسعيرة'
    )
}

export async function deletePriceLabel(id: string) {
    return safeActionWithRevalidation(
        async () => {
            const label = await prisma.priceLabel.findUnique({
                where: { id },
                include: { _count: { select: { productPrices: true } } },
            })
            if (!label) throw Object.assign(new Error('التسعيرة غير موجودة'), { code: 'P2025' })

            await prisma.priceLabel.delete({ where: { id } })
            return { deletedPriceCount: (label as any)._count?.productPrices || 0 }
        },
        PATHS,
        'تعذّر حذف مسمى التسعيرة'
    )
}

export async function setDefaultPriceLabel(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await prisma.priceLabel.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            return prisma.priceLabel.update({ where: { id }, data: { isDefault: true } })
        },
        PATHS,
        'تعذّر تعيين التسعيرة الافتراضية'
    )
}

export async function getNextPriceLabelItemNumber() {
    return generateItemNumber('priceLabel')
}
