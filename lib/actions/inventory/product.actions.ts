'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import {
    prisma,
    PRODUCT_INCLUDE,
    serializeProduct,
    revalidateProduct,
    requireProduct,
    validateProductNumber,
    rebuildProductSkuCodes,
} from './_shared'
import type { ProductInput } from '@/lib/types/product'
import { upsertProductToMeilisearch, deleteProductFromMeilisearch } from '@/lib/utils/meilisearch-sync'
import { requireAuth } from '@/lib/auth-utils'
import { uniqueProductSlug } from '@/lib/utils/slug'

export async function createProduct(data: ProductInput) {
    try {
        await requireAuth()
        if (!data.name?.trim()) return { success: false, error: 'اسم المنتج مطلوب' }

        const pnResult = validateProductNumber(data.productNumber ?? '')
        if (!pnResult.ok) return { success: false, error: pnResult.error }

        const { alternativeNames, tags, slug: inputSlug, productNumber: _pn, ...productData } = data

        const slug = inputSlug?.trim()
            ? await uniqueProductSlug(inputSlug)
            : await uniqueProductSlug(productData.name.trim())

        const product = await prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    ...productData,
                    productNumber: pnResult.value,
                    slug,
                    name: productData.name.trim(),
                    alternativeNames: alternativeNames?.length ? alternativeNames : Prisma.JsonNull,
                    tags: tags?.length ? tags : Prisma.JsonNull,
                },
                include: PRODUCT_INCLUDE as any,
            })

            return created
        })

        revalidatePath('/products')
        revalidatePath('/inventory')
        if (product) upsertProductToMeilisearch(product.id).catch(console.warn)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to create product:', error)
        if (error?.code === 'P2002') return { success: false, error: 'رقم المنتج أو الرابط مستخدم بالفعل' }
        return { success: false, error: 'فشل إنشاء المنتج' }
    }
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
    try {
        await requireAuth()
        const { alternativeNames, tags, slug: inputSlug, productNumber: inputProductNumber, ...productData } = data as any

        delete productData.isAvailable

        let slug: string | undefined
        if (inputSlug !== undefined) {
            slug = await uniqueProductSlug(inputSlug || productData.name || 'product', id)
        }

        let productNumber: string | undefined
        if (inputProductNumber !== undefined) {
            const pnResult = validateProductNumber(inputProductNumber)
            if (!pnResult.ok) return { success: false, error: pnResult.error }
            productNumber = pnResult.value
        }

        const product = await prisma.$transaction(async (tx) => {
            const existing = await tx.product.findUnique({
                where: { id },
                select: { productNumber: true },
            })
            if (!existing) throw new Error('المنتج غير موجود')

            const updated = await tx.product.update({
                where: { id },
                data: {
                    ...productData,
                    ...(productNumber !== undefined ? { productNumber } : {}),
                    slug,
                    alternativeNames: alternativeNames !== undefined
                        ? (alternativeNames?.length ? alternativeNames : Prisma.JsonNull)
                        : undefined,
                    tags: tags !== undefined
                        ? (tags?.length ? tags : Prisma.JsonNull)
                        : undefined,
                },
                include: PRODUCT_INCLUDE as any,
            })

            if (productNumber !== undefined && productNumber !== existing.productNumber) {
                await rebuildProductSkuCodes(id, productNumber, tx)
                return tx.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE as any })
            }

            return updated
        })

        revalidateProduct(id)
        upsertProductToMeilisearch(id).catch(console.warn)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product:', error)
        if (error?.code === 'P2002') return { success: false, error: 'رقم المنتج أو الرابط مستخدم بالفعل' }
        return { success: false, error: 'فشل تحديث المنتج' }
    }
}

export async function deleteProduct(id: string) {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id },
            select: { productNumber: true }
        })

        if (!product) return { success: false, error: 'المنتج غير موجود أو تم حذفه بالفعل' }

        await prisma.product.delete({ where: { id } })

        if (product.productNumber) {
            try {
                const { deleteProductFolder } = await import('../upload')
                await deleteProductFolder(product.productNumber)
            } catch { /* non-fatal */ }
        }

        revalidatePath('/products')
        revalidatePath('/inventory')
        revalidatePath('/items')
        deleteProductFromMeilisearch(id).catch(console.warn)
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'فشل حذف المنتج' }
    }
}

export async function toggleProductNewTag(id: string, isNew: boolean) {
    try {
        await requireAuth()
        const product = await prisma.product.findUnique({
            where: { id },
            select: { tags: true }
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
