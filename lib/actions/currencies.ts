'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation, generateItemNumber } from '@/lib/action-utils'

const PATHS = '/currencies'

export async function getCurrencies() {
    return safeAction(
        () => prisma.currency.findMany({
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        }),
        'تعذّر جلب العملات'
    )
}

export async function getActiveCurrencies() {
    return safeAction(
        () => prisma.currency.findMany({
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        }),
        'تعذّر جلب العملات'
    )
}

export async function createCurrency(data: {
    name: string
    code: string
    symbol: string
    itemNumber?: string
    isDefault?: boolean
    isActive?: boolean
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            }
            const itemNumber = data.itemNumber?.trim() || await generateItemNumber('currency')
            return prisma.currency.create({
                data: {
                    name: data.name,
                    code: data.code,
                    symbol: data.symbol,
                    itemNumber,
                    isDefault: data.isDefault,
                    isActive: data.isActive,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء العملة'
    )
}

export async function updateCurrency(id: string, data: {
    name?: string
    code?: string
    symbol?: string
    itemNumber?: string
    isDefault?: boolean
    isActive?: boolean
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            }
            return prisma.currency.update({ where: { id }, data })
        },
        PATHS,
        'تعذّر تحديث العملة'
    )
}

export async function deleteCurrency(id: string) {
    return safeActionWithRevalidation(
        async () => {
            const linkedCount = await prisma.productPrice.count({ where: { currencyId: id } })
            if (linkedCount > 0) {
                throw new Error(`لا يمكن حذف هذه العملة — مرتبطة بـ ${linkedCount} تسعيرة منتج`)
            }
            await prisma.currency.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر حذف العملة'
    )
}

export async function setDefaultCurrency(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            return prisma.currency.update({ where: { id }, data: { isDefault: true, isActive: true } })
        },
        PATHS,
        'تعذّر تعيين العملة الافتراضية'
    )
}

export async function toggleCurrencyActive(id: string, isActive: boolean) {
    return safeActionWithRevalidation(
        () => prisma.currency.update({ where: { id }, data: { isActive } }),
        PATHS,
        'تعذّر تغيير حالة العملة'
    )
}

export async function getNextCurrencyItemNumber() {
    return generateItemNumber('currency')
}
