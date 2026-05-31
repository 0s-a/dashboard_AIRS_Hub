'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation, generateItemNumber } from '@/lib/action-utils'


const PATHS = '/currencies'

export async function getCurrencies() {
    return safeAction(
        async () => {
            const rows = await prisma.currency.findMany({
                orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            })
            // Decimal → string so Client Components can receive it
            return rows.map(r => ({ ...r, exchangeRate: r.exchangeRate?.toString() ?? null }))
        },
        'تعذّر جلب العملات'
    )
}

export async function getActiveCurrencies() {
    return safeAction(
        async () => {
            const rows = await prisma.currency.findMany({
                orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            })
            return rows.map(r => ({ ...r, exchangeRate: r.exchangeRate?.toString() ?? null }))
        },
        'تعذّر جلب العملات'
    )
}

export async function createCurrency(data: {
    name: string
    code: string
    symbol: string
    itemNumber?: string
    isDefault?: boolean
    exchangeRate?: number | null
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                // Clear all existing defaults first
                await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            }
            const itemNumber = data.itemNumber?.trim() || await generateItemNumber('currency')
            const created = await prisma.currency.create({
                data: {
                    name:         data.name.trim(),
                    code:         data.code.trim().toUpperCase(),
                    symbol:       data.symbol.trim(),
                    itemNumber,
                    isDefault:    data.isDefault  ?? false,
                    // Prisma Decimal accepts string — safe conversion from number
                    exchangeRate: (data.isDefault || data.exchangeRate == null)
                        ? null
                        : new Prisma.Decimal(data.exchangeRate),
                },
            })
            return { ...created, exchangeRate: created.exchangeRate?.toString() ?? null }
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
    exchangeRate?: number | null
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                // Clear all existing defaults, keep the one being updated
                await prisma.currency.updateMany(
                    { where: { isDefault: true, id: { not: id } }, data: { isDefault: false } }
                )
            }

            const exchangeRateDecimal = (data.isDefault || data.exchangeRate == null)
                ? null
                : new Prisma.Decimal(data.exchangeRate)

            const updated = await prisma.currency.update({
                where: { id },
                data: {
                    ...(data.name       !== undefined && { name:        data.name.trim()               }),
                    ...(data.code       !== undefined && { code:        data.code.trim().toUpperCase() }),
                    ...(data.symbol     !== undefined && { symbol:      data.symbol.trim()              }),
                    ...(data.itemNumber !== undefined && { itemNumber:  data.itemNumber.trim()          }),
                    ...(data.isDefault  !== undefined && { isDefault:   data.isDefault                 }),
                    exchangeRate: exchangeRateDecimal,
                },
            })
            return { ...updated, exchangeRate: updated.exchangeRate?.toString() ?? null }
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
            const updated = await prisma.currency.update({ where: { id }, data: { isDefault: true } })
            return { ...updated, exchangeRate: updated.exchangeRate?.toString() ?? null }
        },
        PATHS,
        'تعذّر تعيين العملة الافتراضية'
    )
}


export async function getNextCurrencyItemNumber() {
    return generateItemNumber('currency')
}
