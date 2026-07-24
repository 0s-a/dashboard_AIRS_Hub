'use server'

import { Prisma } from '@prisma/client'
import { prisma, serializeItem, requireItem, revalidateItem } from './_shared'
import { requireAuth } from '@/lib/auth-utils'
import { upsertItemToMeilisearch } from '@/lib/utils/meilisearch-sync'

// ─────────────────────────────────────────────────────────────
// METADATA — Alternative Names & Tags (stored as JSON arrays)
// ─────────────────────────────────────────────────────────────

export async function addAlternativeNameToItem(itemId: string, newName: string) {
    try {
        await requireAuth()
        const trimmed = newName.trim()
        if (!trimmed) return { success: false, error: 'الاسم البديل لا يمكن أن يكون فارغاً' }

        const item = await requireItem(itemId)
        const current = (item.alternativeNames as string[]) ?? []

        if (current.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'هذا الاسم البديل موجود بالفعل' }
        }

        await prisma.item.update({
            where: { id: itemId },
            data: { alternativeNames: [...current, trimmed] as any },
        })

        const updated = await requireItem(itemId)
        revalidateItem(itemId)
        upsertItemToMeilisearch(itemId).catch(console.warn)
        return { success: true, data: serializeItem(updated) }
    } catch (error: any) {
        console.error('Failed to add alternative name:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الاسم البديل' }
    }
}

export async function removeAlternativeNameFromItem(itemId: string, name: string) {
    try {
        await requireAuth()
        const item = await requireItem(itemId)
        const current = (item.alternativeNames as string[]) ?? []
        const remaining = current.filter(n => n !== name)

        if (remaining.length === current.length) {
            return { success: false, error: 'الاسم البديل غير موجود' }
        }

        await prisma.item.update({
            where: { id: itemId },
            data: { alternativeNames: remaining.length ? (remaining as any) : Prisma.JsonNull },
        })

        const updated = await requireItem(itemId)
        revalidateItem(itemId)
        upsertItemToMeilisearch(itemId).catch(console.warn)
        return { success: true, data: serializeItem(updated) }
    } catch (error: any) {
        console.error('Failed to remove alternative name:', error)
        return { success: false, error: error?.message ?? 'فشل حذف الاسم البديل' }
    }
}

export async function addTagToItem(itemId: string, newTag: string) {
    try {
        await requireAuth()
        const trimmed = newTag.trim()
        if (!trimmed) return { success: false, error: 'الوسم لا يمكن أن يكون فارغاً' }

        const item = await requireItem(itemId)
        const current = (item.tags as string[]) ?? []

        if (current.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'هذا الوسم موجود بالفعل' }
        }

        await prisma.item.update({
            where: { id: itemId },
            data: { tags: [...current, trimmed] as any },
        })

        const updated = await requireItem(itemId)
        revalidateItem(itemId)
        upsertItemToMeilisearch(itemId).catch(console.warn)
        return { success: true, data: serializeItem(updated) }
    } catch (error: any) {
        console.error('Failed to add tag:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الوسم' }
    }
}

export async function removeTagFromItem(itemId: string, tag: string) {
    try {
        await requireAuth()
        const item = await requireItem(itemId)
        const current = (item.tags as string[]) ?? []
        const remaining = current.filter(t => t !== tag)

        if (remaining.length === current.length) {
            return { success: false, error: 'الوسم غير موجود' }
        }

        await prisma.item.update({
            where: { id: itemId },
            data: { tags: remaining.length ? (remaining as any) : Prisma.JsonNull },
        })

        const updated = await requireItem(itemId)
        revalidateItem(itemId)
        upsertItemToMeilisearch(itemId).catch(console.warn)
        return { success: true, data: serializeItem(updated) }
    } catch (error: any) {
        console.error('Failed to remove tag:', error)
        return { success: false, error: error?.message ?? 'فشل حذف الوسم' }
    }
}
