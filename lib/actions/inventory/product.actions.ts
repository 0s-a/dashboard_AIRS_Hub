'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import {
    prisma,
    PRODUCT_INCLUDE,
    serializeProduct,
    revalidateProduct,
    requireProduct,
    normalizeAttributeInputs,
} from './_shared'
import type { ProductInput } from '@/lib/types/product'
import { upsertProductToMeilisearch, deleteProductFromMeilisearch } from '@/lib/utils/meilisearch-sync'
import { requireAuth } from '@/lib/auth-utils'
import { uniqueProductSlug } from '@/lib/utils/slug'

function normalizeItemNumber(input: string | null | undefined): string | null {
    const v = input?.trim()
    return v ? v : null
}

function requireProductFields(data: Partial<ProductInput>, mode: 'create' | 'update') {
    const inherits = Boolean(data.inheritsFamilyName)
    const hasFamily = Boolean(data.familyId?.trim())

    if (inherits && !hasFamily && (mode === 'create' || data.inheritsFamilyName !== undefined || data.familyId !== undefined)) {
        // validated later with resolveFamilyFields; skip name if inheriting with family
    }

    if (mode === 'create' || data.name !== undefined) {
        if (!inherits && !data.name?.trim()) return 'اسم المنتج مطلوب'
    }
    if (mode === 'create' || data.itemNumber !== undefined) {
        if (!normalizeItemNumber(data.itemNumber)) return 'رقم الصنف مطلوب'
    }
    if (mode === 'create' || data.brandId !== undefined) {
        if (!data.brandId?.trim()) return 'البراند مطلوب'
    }
    if (mode === 'create' || data.categoryId !== undefined) {
        if (!data.categoryId?.trim()) return 'التصنيف مطلوب'
    }
    return null
}

type ResolvedFamilyFields = {
    familyId: string | null
    inheritsFamilyName: boolean
    name: string
}

async function resolveFamilyFields(
    data: Partial<ProductInput>,
    existing?: { name: string; familyId: string | null; inheritsFamilyName: boolean },
    tx: Prisma.TransactionClient = prisma
): Promise<ResolvedFamilyFields> {
    const familyId =
        data.familyId !== undefined
            ? (data.familyId?.trim() || null)
            : (existing?.familyId ?? null)

    let inheritsFamilyName =
        data.inheritsFamilyName !== undefined
            ? Boolean(data.inheritsFamilyName)
            : (existing?.inheritsFamilyName ?? false)

    if (!familyId) {
        inheritsFamilyName = false
    }

    if (inheritsFamilyName && !familyId) {
        throw new Error('لا يمكن وراثة الاسم بدون منتج رئيسي')
    }

    let familyName: string | null = null
    if (familyId) {
        const family = await tx.productFamily.findUnique({
            where: { id: familyId },
            select: { name: true },
        })
        if (!family) throw new Error('المنتج الرئيسي غير موجود')
        familyName = family.name
    }

    let name =
        data.name !== undefined
            ? (data.name?.trim() || '')
            : (existing?.name ?? '')

    if (inheritsFamilyName && familyName) {
        if (!name) name = familyName
    } else if (!name) {
        throw new Error('اسم المنتج مطلوب')
    }

    return { familyId, inheritsFamilyName, name }
}

async function replaceProductAttributes(
    productId: string,
    entries: { attributeId: string; value: string }[],
    tx: Prisma.TransactionClient = prisma
) {
    await tx.productAttributeValue.deleteMany({ where: { productId } })
    if (!entries.length) return
    await tx.productAttributeValue.createMany({
        data: entries.map(e => ({
            productId,
            attributeId: e.attributeId,
            value: e.value,
        })),
    })
}

export async function createProduct(data: ProductInput) {
    try {
        await requireAuth()
        const fieldError = requireProductFields(data, 'create')
        if (fieldError) return { success: false, error: fieldError }

        const { alternativeNames, tags, slug: inputSlug, itemNumber, productAttributes } = data
        const normalizedItemNumber = normalizeItemNumber(itemNumber)!
        const attrs = normalizeAttributeInputs(productAttributes)

        const product = await prisma.$transaction(async (tx) => {
            const familyFields = await resolveFamilyFields(data, undefined, tx)

            const slug = inputSlug?.trim()
                ? await uniqueProductSlug(inputSlug)
                : await uniqueProductSlug(familyFields.name)

            const created = await tx.product.create({
                data: {
                    brandId: data.brandId.trim(),
                    categoryId: data.categoryId.trim(),
                    description: data.description,
                    isAvailable: data.isAvailable,
                    name: familyFields.name,
                    familyId: familyFields.familyId,
                    inheritsFamilyName: familyFields.inheritsFamilyName,
                    itemNumber: normalizedItemNumber,
                    slug,
                    alternativeNames: alternativeNames?.length ? alternativeNames : Prisma.JsonNull,
                    tags: tags?.length ? tags : Prisma.JsonNull,
                },
            })
            await replaceProductAttributes(created.id, attrs, tx)
            return tx.product.findUniqueOrThrow({
                where: { id: created.id },
                include: PRODUCT_INCLUDE as any,
            })
        })

        revalidatePath('/products')
        revalidatePath('/inventory')
        upsertProductToMeilisearch(product.id).catch(console.warn)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to create product:', error)
        if (
            error?.message === 'لا يمكن تكرار نفس الصفة على المنتج' ||
            error?.message === 'لا يمكن وراثة الاسم بدون منتج رئيسي' ||
            error?.message === 'المنتج الرئيسي غير موجود' ||
            error?.message === 'اسم المنتج مطلوب'
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
            return { success: false, error: 'صفة غير موجودة أو غير صالحة' }
        }
        return { success: false, error: 'فشل إنشاء المنتج' }
    }
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
    try {
        await requireAuth()
        const fieldError = requireProductFields(data, 'update')
        if (fieldError) return { success: false, error: fieldError }

        const { alternativeNames, tags, slug: inputSlug, itemNumber, productAttributes } = data

        const attrs =
            productAttributes !== undefined
                ? normalizeAttributeInputs(productAttributes)
                : undefined

        const product = await prisma.$transaction(async (tx) => {
            const existing = await tx.product.findUnique({
                where: { id },
                select: { name: true, familyId: true, inheritsFamilyName: true },
            })
            if (!existing) throw new Error('المنتج غير موجود')

            const familyFields = await resolveFamilyFields(data, existing, tx)

            let slug: string | undefined
            if (inputSlug !== undefined) {
                slug = await uniqueProductSlug(inputSlug || familyFields.name || 'product', id)
            }

            await tx.product.update({
                where: { id },
                data: {
                    ...(data.brandId !== undefined ? { brandId: data.brandId.trim() } : {}),
                    ...(data.categoryId !== undefined ? { categoryId: data.categoryId.trim() } : {}),
                    ...(data.description !== undefined ? { description: data.description } : {}),
                    ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
                    ...(itemNumber !== undefined ? { itemNumber: normalizeItemNumber(itemNumber)! } : {}),
                    name: familyFields.name,
                    familyId: familyFields.familyId,
                    inheritsFamilyName: familyFields.inheritsFamilyName,
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
                await replaceProductAttributes(id, attrs, tx)
            }
            return tx.product.findUniqueOrThrow({
                where: { id },
                include: PRODUCT_INCLUDE as any,
            })
        })

        revalidateProduct(id)
        upsertProductToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product:', error)
        if (
            error?.message === 'لا يمكن تكرار نفس الصفة على المنتج' ||
            error?.message === 'لا يمكن وراثة الاسم بدون منتج رئيسي' ||
            error?.message === 'المنتج الرئيسي غير موجود' ||
            error?.message === 'اسم المنتج مطلوب' ||
            error?.message === 'المنتج غير موجود'
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
            return { success: false, error: 'صفة غير موجودة أو غير صالحة' }
        }
        return { success: false, error: 'فشل تحديث المنتج' }
    }
}

export async function deleteProduct(id: string) {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id },
            select: { itemNumber: true },
        })

        if (!product) return { success: false, error: 'المنتج غير موجود أو تم حذفه بالفعل' }

        await prisma.product.delete({ where: { id } })

        if (product.itemNumber) {
            try {
                const { deleteProductFolder } = await import('../upload')
                await deleteProductFolder(product.itemNumber)
            } catch { /* non-fatal */ }
        }

        revalidatePath('/products')
        revalidatePath('/inventory')
        deleteProductFromMeilisearch(id).catch(console.warn)
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'فشل حذف المنتج' }
    }
}

export async function toggleProductAvailability(id: string, isAvailable: boolean) {
    try {
        await requireAuth()
        const product = await prisma.product.update({
            where: { id },
            data: { isAvailable },
            include: PRODUCT_INCLUDE as any,
        })
        revalidateProduct(id)
        upsertProductToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Failed to toggle availability:', error)
        return { success: false, error: 'فشل تحديث التوفر' }
    }
}

export async function toggleProductNewTag(id: string, isNew: boolean) {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id },
            select: { tags: true },
        })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        let currentTags = Array.isArray(product.tags) ? [...product.tags] : []
        if (isNew) {
            if (!currentTags.includes('new')) currentTags.push('new')
        } else {
            currentTags = currentTags.filter(tag => tag !== 'new')
        }

        await prisma.product.update({
            where: { id },
            data: { tags: currentTags.length > 0 ? currentTags : Prisma.JsonNull },
        })

        const updated = await requireProduct(id)
        revalidateProduct(id)
        upsertProductToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeProduct(updated) }
    } catch (error) {
        console.error('Failed to toggle new tag:', error)
        return { success: false, error: 'فشل تحديث علامة جديد' }
    }
}

export async function createProductWithDefaults(data: ProductInput) {
    return createProduct(data)
}
