'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

async function generateCurrencyItemNumber(): Promise<string> {
    const last = await prisma.currency.findFirst({
        orderBy: { itemNumber: 'desc' },
        select: { itemNumber: true },
    })
    const next = last ? parseInt(last.itemNumber, 10) + 1 : 1
    return String(next).padStart(4, '0')
}

export async function getCurrencies() {
    try {
        const currencies = await prisma.currency.findMany({
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
        })
        return { success: true, data: currencies }
    } catch (error) {
        console.error('Failed to fetch currencies:', error)
        return { success: false, error: 'تعذّر جلب العملات', data: [] as any[] }
    }
}

export async function getActiveCurrencies() {
    try {
        const currencies = await prisma.currency.findMany({
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
        })
        return { success: true, data: currencies }
    } catch (error) {
        console.error('Failed to fetch active currencies:', error)
        return { success: false, error: 'تعذّر جلب العملات', data: [] as any[] }
    }
}

export async function createCurrency(data: {
    name: string
    code: string
    symbol: string
    itemNumber?: string
    isDefault?: boolean
    isActive?: boolean
}) {
    try {
        if (data.isDefault) {
            await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
        }
        const itemNumber = data.itemNumber?.trim() || await generateCurrencyItemNumber()
        const currency = await prisma.currency.create({
            data: {
                name: data.name,
                code: data.code,
                symbol: data.symbol,
                itemNumber,
                isDefault: data.isDefault,
                isActive: data.isActive,
            }
        })
        revalidatePath('/currencies')
        return { success: true, data: currency }
    } catch (error: any) {
        console.error('Failed to create currency:', error)
        if (error.code === 'P2002') return { success: false, error: 'العملة (الاسم أو الكود أو الرقم) موجودة مسبقاً' }
        return { success: false, error: 'تعذّر إنشاء العملة' }
    }
}

export async function updateCurrency(id: string, data: {
    name?: string
    code?: string
    symbol?: string
    itemNumber?: string
    isDefault?: boolean
    isActive?: boolean
}) {
    try {
        if (data.isDefault) {
           await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
        }
        const currency = await prisma.currency.update({ where: { id }, data })
        revalidatePath('/currencies')
        return { success: true, data: currency }
    } catch (error: any) {
        console.error('Failed to update currency:', error)
        if (error.code === 'P2002') return { success: false, error: 'العملة (الاسم أو الكود أو الرقم) موجودة مسبقاً' }
        return { success: false, error: 'تعذّر تحديث العملة' }
    }
}

export async function deleteCurrency(id: string) {
    try {
        // Check if currency is linked to any product prices
        const linkedCount = await prisma.productPrice.count({ where: { currencyId: id } })
        if (linkedCount > 0) {
            return { success: false, error: `لا يمكن حذف هذه العملة — مرتبطة بـ ${linkedCount} تسعيرة منتج` }
        }

        await prisma.currency.delete({ where: { id } })
        revalidatePath('/currencies')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete currency:', error)
        return { success: false, error: 'تعذّر حذف العملة' }
    }
}

export async function setDefaultCurrency(id: string) {
    try {
        await prisma.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
        await prisma.currency.update({ where: { id }, data: { isDefault: true, isActive: true } })
        revalidatePath('/currencies')
        return { success: true }
    } catch (error) {
        console.error('Failed to set default currency:', error)
        return { success: false, error: 'تعذّر تعيين العملة الافتراضية' }
    }
}

export async function toggleCurrencyActive(id: string, isActive: boolean) {
    try {
        await prisma.currency.update({ where: { id }, data: { isActive } })
        revalidatePath('/currencies')
        return { success: true }
    } catch (error) {
        console.error('Failed to toggle currency:', error)
        return { success: false, error: 'تعذّر تغيير حالة العملة' }
    }
}

export async function getNextCurrencyItemNumber() {
    return await generateCurrencyItemNumber()
}
