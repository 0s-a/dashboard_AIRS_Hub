'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import {
    prisma,
    ITEM_INCLUDE,
    serializeItem,
    revalidateItem,
    requireItem,
    normalizeAttributeInputs,
} from './_shared'
import type { ItemInput } from '@/lib/types/item'
import { upsertItemToMeilisearch, removeItemFromMeilisearch } from '@/lib/utils/meilisearch-sync'
import { requireAuth } from '@/lib/auth-utils'
import { uniqueItemSlug } from '@/lib/utils/slug'

function normalizeItemNumber(input: string | null | undefined): string | null {
    const v = input?.trim()
    return v ? v : null
}

function requireItemFields(data: Partial<ItemInput>, mode: 'create' | 'update') {
    if (mode === 'create' || data.name !== undefined) {
        if (!data.name?.trim()) return 'اسم الصنف مطلوب'
    }
    if (mode === 'create' || data.itemNumber !== undefined) {
        if (!normalizeItemNumber(data.itemNumber)) return 'رقم الصنف مطلوب'
    }
    if (mode === 'create' || data.productId !== undefined) {
        if (!data.productId?.trim()) return 'المنتج مطلوب'
    }
    return null
}

async function requireProductId(
    productId: string | null | undefined,
    tx: Prisma.TransactionClient = prisma
): Promise<string> {
    const id = productId?.trim()
    if (!id) throw new Error('المنتج مطلوب')
    const product = await tx.product.findUnique({
        where: { id },
        select: { id: true },
    })
    if (!product) throw new Error('المنتج غير موجود')
    return id
}

async function replaceItemAttributes(
    itemId: string,
    entries: { attributeId: string; value: string }[],
    tx: Prisma.TransactionClient = prisma
) {
    await tx.itemAttributeValue.deleteMany({ where: { itemId } })
    if (!entries.length) return
    await tx.itemAttributeValue.createMany({
        data: entries.map(e => ({
            itemId,
            attributeId: e.attributeId,
            value: e.value,
        })),
    })
}

export async function createItem(data: ItemInput) {
    try {
        await requireAuth()
        const fieldError = requireItemFields(data, 'create')
        if (fieldError) return { success: false, error: fieldError }

        const { alternativeNames, tags, slug: inputSlug, itemNumber, itemAttributes } = data
        const normalizedItemNumber = normalizeItemNumber(itemNumber)!
        const attrs = normalizeAttributeInputs(itemAttributes)
        const name = data.name.trim()

        const item = await prisma.$transaction(async (tx) => {
            const productId = await requireProductId(data.productId, tx)

            const slug = inputSlug?.trim()
                ? await uniqueItemSlug(inputSlug)
                : await uniqueItemSlug(name)

            const created = await tx.item.create({
                data: {
                    description: data.description,
                    isAvailable: data.isAvailable,
                    name,
                    productId,
                    itemNumber: normalizedItemNumber,
                    slug,
                    alternativeNames: alternativeNames?.length ? alternativeNames : Prisma.JsonNull,
                    tags: tags?.length ? tags : Prisma.JsonNull,
                },
            })
            await replaceItemAttributes(created.id, attrs, tx)
            return tx.item.findUniqueOrThrow({
                where: { id: created.id },
                include: ITEM_INCLUDE as any,
            })
        })

        revalidatePath('/items')
        revalidatePath('/products')
        upsertItemToMeilisearch(item.id).catch(console.warn)
        return { success: true, data: serializeItem(item) }
    } catch (error: any) {
        console.error('Failed to create item:', error)
        if (
            error?.message === 'لا يمكن تكرار نفس الصفة على الصنف' ||
            error?.message === 'المنتج غير موجود' ||
            error?.message === 'المنتج مطلوب' ||
            error?.message === 'اسم الصنف مطلوب'
        ) {
            return { success: false, error: error.message }
        }
        if (error?.code === 'P2002') {
            const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(',') : String(error?.meta?.target ?? '')
            if (target.includes('itemNumber')) {
                return { success: false, error: 'رقم الصنف مستخدم بالفعل — يجب أن يكون فريداً' }
            }
            return { success: false, error: 'تعارض في البيانات الفريدة (رقم الصنف أو الرابط)' }
        }
        if (error?.code === 'P2003') {
            return { success: false, error: 'صفة أو منتج غير صالح' }
        }
        return { success: false, error: 'فشل إنشاء الصنف' }
    }
}

export async function updateItem(id: string, data: Partial<ItemInput>) {
    try {
        await requireAuth()
        const fieldError = requireItemFields(data, 'update')
        if (fieldError) return { success: false, error: fieldError }

        const { alternativeNames, tags, slug: inputSlug, itemNumber, itemAttributes } = data

        const attrs =
            itemAttributes !== undefined
                ? normalizeAttributeInputs(itemAttributes)
                : undefined

        const item = await prisma.$transaction(async (tx) => {
            const existing = await tx.item.findUnique({
                where: { id },
                select: { name: true, productId: true },
            })
            if (!existing) throw new Error('الصنف غير موجود')

            const name =
                data.name !== undefined ? data.name.trim() : existing.name
            if (!name) throw new Error('اسم الصنف مطلوب')

            const productId =
                data.productId !== undefined
                    ? await requireProductId(data.productId, tx)
                    : existing.productId

            let slug: string | undefined
            if (inputSlug !== undefined) {
                slug = await uniqueItemSlug(inputSlug || name || 'item', id)
            }

            await tx.item.update({
                where: { id },
                data: {
                    ...(data.description !== undefined ? { description: data.description } : {}),
                    ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
                    ...(itemNumber !== undefined ? { itemNumber: normalizeItemNumber(itemNumber)! } : {}),
                    name,
                    productId,
                    slug,
                    alternativeNames: alternativeNames !== undefined
                        ? (alternativeNames?.length ? alternativeNames : Prisma.JsonNull)
                        : undefined,
                    tags: tags !== undefined
                        ? (tags?.length ? tags : Prisma.JsonNull)
                        : undefined,
                },
            })
            if (attrs !== undefined) {
                await replaceItemAttributes(id, attrs, tx)
            }
            return tx.item.findUniqueOrThrow({
                where: { id },
                include: ITEM_INCLUDE as any,
            })
        })

        revalidateItem(id)
        upsertItemToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeItem(item) }
    } catch (error: any) {
        console.error('Failed to update item:', error)
        if (
            error?.message === 'لا يمكن تكرار نفس الصفة على الصنف' ||
            error?.message === 'المنتج غير موجود' ||
            error?.message === 'المنتج مطلوب' ||
            error?.message === 'اسم الصنف مطلوب' ||
            error?.message === 'الصنف غير موجود'
        ) {
            return { success: false, error: error.message }
        }
        if (error?.code === 'P2002') {
            const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(',') : String(error?.meta?.target ?? '')
            if (target.includes('itemNumber')) {
                return { success: false, error: 'رقم الصنف مستخدم بالفعل — يجب أن يكون فريداً' }
            }
            return { success: false, error: 'تعارض في البيانات الفريدة (رقم الصنف أو الرابط)' }
        }
        if (error?.code === 'P2003') {
            return { success: false, error: 'صفة أو منتج غير صالح' }
        }
        return { success: false, error: 'فشل تحديث الصنف' }
    }
}

export async function deleteItem(id: string) {
    try {
        await requireAuth()
        const item = await prisma.item.findUnique({
            where: { id },
            select: { itemNumber: true },
        })

        if (!item) return { success: false, error: 'الصنف غير موجود أو تم حذفه بالفعل' }

        await prisma.item.delete({ where: { id } })

        if (item.itemNumber) {
            try {
                const { deleteProductFolder } = await import('../upload')
                await deleteProductFolder(item.itemNumber)
            } catch { /* non-fatal */ }
        }

        revalidatePath('/items')
        revalidatePath('/products')
        removeItemFromMeilisearch(id).catch(console.warn)
        return { success: true }
    } catch (error) {
        console.error('Failed to delete item:', error)
        return { success: false, error: 'فشل حذف الصنف' }
    }
}

export async function toggleItemAvailability(id: string, isAvailable: boolean) {
    try {
        await requireAuth()
        const item = await prisma.item.update({
            where: { id },
            data: { isAvailable },
            include: ITEM_INCLUDE as any,
        })
        revalidateItem(id)
        upsertItemToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeItem(item) }
    } catch (error) {
        console.error('Failed to toggle availability:', error)
        return { success: false, error: 'فشل تحديث التوفر' }
    }
}

export async function toggleItemNewTag(id: string, isNew: boolean) {
    try {
        await requireAuth()
        const item = await prisma.item.findUnique({
            where: { id },
            select: { tags: true },
        })
        if (!item) return { success: false, error: 'الصنف غير موجود' }

        let currentTags = Array.isArray(item.tags) ? [...item.tags] : []
        if (isNew) {
            if (!currentTags.includes('new')) currentTags.push('new')
        } else {
            currentTags = currentTags.filter(tag => tag !== 'new')
        }

        await prisma.item.update({
            where: { id },
            data: { tags: currentTags.length > 0 ? currentTags : Prisma.JsonNull },
        })

        const updated = await requireItem(id)
        revalidateItem(id)
        upsertItemToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeItem(updated) }
    } catch (error) {
        console.error('Failed to toggle new tag:', error)
        return { success: false, error: 'فشل تحديث علامة جديد' }
    }
}

export async function createItemWithDefaults(data: ItemInput) {
    return createItem(data)
}
