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
 * Usage: await generateItemNumber('currency')  → "0005"
 */
export async function generateItemNumber(
    model: 'currency' | 'priceLabel' | 'order'
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
            const last = await prisma.order.findFirst({
                orderBy: { orderNumber: 'desc' },
                select: { orderNumber: true },
            })
            lastNumber = last?.orderNumber ?? null
            break
        }
    }

    const next = lastNumber ? parseInt(lastNumber, 10) + 1 : 1
    return String(next).padStart(4, '0')
}

/**
 * Resolve unit price and currency for a product + price label combo.
 * Optionally filter by unitId for unit-specific pricing.
 */
export async function resolveProductPrice(productId: string, priceLabelId: string, unitId?: string) {
    return prisma.productPrice.findFirst({
        where: { productId, priceLabelId, ...(unitId ? { unitId } : {}) },
        include: { currency: true, unit: true },
    })
}
