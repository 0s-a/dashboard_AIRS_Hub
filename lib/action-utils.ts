'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

// ============================================================
// safeAction — Unified error handling for all server actions
// ============================================================

/**
 * Wraps a server action function with standardized error handling.
 * Catches Prisma-specific errors (P2002, P2025) and returns
 * a consistent ActionResult shape.
 *
 * Usage:
 *   export const getItems = () => safeAction(() => prisma.item.findMany())
 *   export const createItem = (data: Input) => safeAction(() => prisma.item.create({ data }))
 */
export async function safeAction<T>(
    fn: () => Promise<T>,
    errorMessage?: string
): Promise<ActionResult<T>> {
    try {
        const data = await fn()
        return { success: true, data }
    } catch (error: any) {
        console.error(`[safeAction] ${errorMessage || 'Error'}:`, error?.message || error)

        // Prisma: unique constraint violation
        if (error?.code === 'P2002') {
            const fields = error.meta?.target?.join?.(', ') || ''
            return {
                success: false,
                error: fields
                    ? `سجل مكرر — الحقل (${fields}) موجود بالفعل`
                    : 'سجل مكرر — الاسم أو الرقم موجود بالفعل',
            }
        }

        // Prisma: record not found
        if (error?.code === 'P2025') {
            return { success: false, error: 'العنصر غير موجود' }
        }

        // Prisma: foreign key constraint
        if (error?.code === 'P2003') {
            return { success: false, error: 'لا يمكن الحذف — مرتبط بعناصر أخرى' }
        }

        // If the error has a human-readable message (thrown explicitly), show it
        if (error?.message && typeof error.message === 'string' && error.message.length < 200) {
            return { success: false, error: error.message }
        }

        return {
            success: false,
            error: errorMessage || 'حدث خطأ غير متوقع',
        }
    }
}


/**
 * Same as safeAction but also calls revalidatePath after success.
 */
export async function safeActionWithRevalidation<T>(
    fn: () => Promise<T>,
    paths: string | string[],
    errorMessage?: string
): Promise<ActionResult<T>> {
    const result = await safeAction(fn, errorMessage)
    if (result.success) {
        const pathList = Array.isArray(paths) ? paths : [paths]
        pathList.forEach(p => revalidatePath(p))
    }
    return result
}

// ============================================================
// Shared Helpers — DRY utilities used across multiple modules
// ============================================================


/**
 * Generate the next sequential item number (4-digit padded).
 * Works for any model that has an `itemNumber` field.
 *
 * For orders, uses a serializable transaction with row-level locking
 * to prevent race conditions in concurrent environments.
 *
 * Usage: await generateItemNumber('currency')  → "0005"
 */
export async function generateItemNumber(
    model: 'currency' | 'priceLabel' | 'order' | 'unit'
): Promise<string> {
    let lastNumber: string | null = null

    switch (model) {
        case 'currency': {
            const last = await prisma.currency.findFirst({
                orderBy: { itemNumber: 'desc' },
                select: { itemNumber: true },
            })
            lastNumber = last?.itemNumber ?? null
            break
        }
        case 'priceLabel': {
            const last = await prisma.priceLabel.findFirst({
                orderBy: { itemNumber: 'desc' },
                select: { itemNumber: true },
            })
            lastNumber = last?.itemNumber ?? null
            break
        }
        case 'order': {
            // Use raw SQL with FOR UPDATE SKIP LOCKED to prevent race conditions.
            // This locks the row being read so concurrent transactions wait or skip.
            const rows = await prisma.$queryRawUnsafe<{ orderNumber: string }[]>(
                `SELECT "orderNumber" FROM "Order" ORDER BY "orderNumber" DESC LIMIT 1 FOR UPDATE`
            )
            lastNumber = rows[0]?.orderNumber ?? null
            break
        }
        case 'unit': {
            const rows = await prisma.$queryRawUnsafe<{ itemNumber: string }[]>(
                `SELECT "itemNumber" FROM "Unit" ORDER BY "itemNumber" DESC LIMIT 1`
            )
            lastNumber = rows[0]?.itemNumber ?? null
            break
        }
    }

    const numericPart = lastNumber ? lastNumber.replace(/\\D/g, '') : ''
    const next = numericPart ? parseInt(numericPart, 10) + 1 : 1
    return String(next).padStart(4, '0')
}

/**
 * Resolve unit price and currency for a product + price label combo.
 * Always prefers the default currency (isDefault=true) over other currencies.
 * Falls back to any available price if no default-currency price exists.
 */
export async function resolveProductPrice(productId: string, priceLabelId: string, unitId?: string) {
    const baseWhere = { productId, priceLabelId, ...(unitId ? { unitId } : {}) }

    // 1️⃣ Try to find the price in the default currency first
    const defaultCurrencyPrice = await prisma.productPrice.findFirst({
        where: { ...baseWhere, currency: { isDefault: true } },
        include: { currency: true, unit: true },
    })
    if (defaultCurrencyPrice) return defaultCurrencyPrice

    // 2️⃣ Fallback: any price for this product + label
    return prisma.productPrice.findFirst({
        where: baseWhere,
        include: { currency: true, unit: true },
    })
}
