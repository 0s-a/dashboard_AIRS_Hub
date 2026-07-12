'use server'

import { Prisma } from '@prisma/client'
import { prisma, serializeProduct, requireProduct, revalidateProduct } from './_shared'
import { requireAuth } from '@/lib/auth-utils'

// ─────────────────────────────────────────────────────────────
// METADATA — Alternative Names & Tags (stored as JSON arrays)
// ─────────────────────────────────────────────────────────────

// ── Alternative Names ─────────────────────────────────────────

/** Add a new alternative name to a product */
export async function addAlternativeNameToProduct(productId: string, newName: string) {
    try {
        await requireAuth()
        const trimmed = newName.trim()
        if (!trimmed) return { success: false, error: 'الاسم البديل لا يمكن أن يكون فارغاً' }

        const product = await requireProduct(productId)
        const current = (product.alternativeNames as string[]) ?? []

        if (current.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'هذا الاسم البديل موجود بالفعل' }
        }

        await prisma.product.update({
            where: { id: productId },
            data: { alternativeNames: [...current, trimmed] as any },
        })

        const updated = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to add alternative name:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الاسم البديل' }
    }
}

/** Remove an alternative name from a product */
export async function removeAlternativeNameFromProduct(productId: string, name: string) {
    try {
        await requireAuth()
        const product = await requireProduct(productId)
        const current = (product.alternativeNames as string[]) ?? []
        const remaining = current.filter(n => n !== name)

        if (remaining.length === current.length) {
            return { success: false, error: 'الاسم البديل غير موجود' }
        }

        await prisma.product.update({
            where: { id: productId },
            data: { alternativeNames: remaining.length ? (remaining as any) : Prisma.JsonNull },
        })

        const updated = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to remove alternative name:', error)
        return { success: false, error: error?.message ?? 'فشل حذف الاسم البديل' }
    }
}

// ── Tags ──────────────────────────────────────────────────────

/** Add a tag to a product */
export async function addTagToProduct(productId: string, newTag: string) {
    try {
        await requireAuth()
        const trimmed = newTag.trim()
        if (!trimmed) return { success: false, error: 'الوسم لا يمكن أن يكون فارغاً' }

        const product = await requireProduct(productId)
        const current = (product.tags as string[]) ?? []

        if (current.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'هذا الوسم موجود بالفعل' }
        }

        await prisma.product.update({
            where: { id: productId },
            data: { tags: [...current, trimmed] as any },
        })

        const updated = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to add tag:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الوسم' }
    }
}

/** Remove a tag from a product */
export async function removeTagFromProduct(productId: string, tag: string) {
    try {
        await requireAuth()
        const product = await requireProduct(productId)
        const current = (product.tags as string[]) ?? []
        const remaining = current.filter(t => t !== tag)

        if (remaining.length === current.length) {
            return { success: false, error: 'الوسم غير موجود' }
        }

        await prisma.product.update({
            where: { id: productId },
            data: { tags: remaining.length ? (remaining as any) : Prisma.JsonNull },
        })

        const updated = await requireProduct(productId)
        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to remove tag:', error)
        return { success: false, error: error?.message ?? 'فشل حذف الوسم' }
    }
}
