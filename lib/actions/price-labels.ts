'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation, generateItemNumber } from '@/lib/action-utils'

const PATHS = '/price-labels'

export async function getPriceLabels() {
    return safeAction(
        () => prisma.priceLabel.findMany({ orderBy: { name: 'asc' } }),
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
}) {
    return safeActionWithRevalidation(
        async () => {
            const itemNumber = data.itemNumber?.trim() || await generateItemNumber('priceLabel')
            return prisma.priceLabel.create({
                data: {
                    name: data.name,
                    itemNumber,
                    notes: data.notes,
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
}) {
    return safeActionWithRevalidation(
        () => prisma.priceLabel.update({
            where: { id },
            data: {
                name: data.name,
                itemNumber: data.itemNumber,
                notes: data.notes,
            },
        }),
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

export async function getNextPriceLabelItemNumber() {
    return generateItemNumber('priceLabel')
}
