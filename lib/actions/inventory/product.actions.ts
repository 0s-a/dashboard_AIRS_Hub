'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma, PRODUCT_INCLUDE, serializeProduct, revalidateProduct, requireProduct, generateProductCode } from './_shared'
import type { ProductInput } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// WRITE — Product CRUD Actions
// ─────────────────────────────────────────────────────────────

/** Create a new product */
export async function createProduct(data: ProductInput) {
    try {
        if (!data.name?.trim()) return { success: false, error: 'اسم المنتج مطلوب' }

        const { alternativeNames, tags, ...productData } = data

        // Resolve category/brand codes for product code generation
        const [catCode, brandCode] = await Promise.all([
            productData.categoryId
                ? prisma.category.findUnique({ where: { id: productData.categoryId }, select: { code: true } })
                    .then(c => c?.code ?? null)
                : null,
            productData.brandId
                ? prisma.brand.findUnique({ where: { id: productData.brandId }, select: { code: true } })
                    .then(b => b?.code ?? null)
                : null,
        ])

        const product = await prisma.$transaction(async (tx) => {
            const productCode = await generateProductCode(catCode, brandCode, tx)

            return await (tx.product as any).create({
                data: {
                    ...productData,
                    productCode,
                    itemNumber: productData.itemNumber?.trim() || null,
                    name: productData.name.trim(),
                    alternativeNames: alternativeNames?.length ? alternativeNames : Prisma.JsonNull,
                    tags: tags?.length ? tags : Prisma.JsonNull,
                },
                include: PRODUCT_INCLUDE,
            })
        })

        revalidatePath('/inventory')
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to create product:', error)
        if (error?.code === 'P2002') return { success: false, error: 'رقم الصنف مستخدم بالفعل' }
        return { success: false, error: 'فشل إنشاء المنتج' }
    }
}

/** Update product fields. productCode is IMMUTABLE — never changes after creation. */
export async function updateProduct(id: string, data: Partial<ProductInput>) {
    try {
        const { alternativeNames, tags, ...productData } = data as any

        // productCode is IMMUTABLE — strip if accidentally passed
        delete productData.productCode

        // ── Transaction: update product ──────────────────────────────
        const product = await prisma.$transaction(async (tx) => {
            return await (tx.product as any).update({
                where: { id },
                data: {
                    ...productData,
                    itemNumber: productData.itemNumber !== undefined
                        ? (productData.itemNumber?.trim() || null)
                        : undefined,
                    alternativeNames: alternativeNames !== undefined
                        ? (alternativeNames?.length ? alternativeNames : Prisma.JsonNull)
                        : undefined,
                    tags: tags !== undefined
                        ? (tags?.length ? tags : Prisma.JsonNull)
                        : undefined,
                },
                include: PRODUCT_INCLUDE,
            })
        })

        revalidateProduct(id)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product:', error)
        if (error?.code === 'P2002') return { success: false, error: 'رقم الصنف مستخدم بالفعل' }
        return { success: false, error: 'فشل تحديث المنتج' }
    }
}

/** Permanently delete a product and clean up its image folder */
export async function deleteProduct(id: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            select: { productCode: true, itemNumber: true }
        })

        if (!product) return { success: false, error: 'المنتج غير موجود أو تم حذفه بالفعل' }

        await prisma.product.delete({ where: { id } })

        // Clean up image folder using productCode (primary identifier)
        const folderName = product.productCode || product.itemNumber
        if (folderName) {
            try {
                const { deleteProductFolder } = await import('../upload')
                await deleteProductFolder(folderName)
            } catch {
                // Non-fatal: cleanup failure should not block deletion
            }
        }

        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'فشل حذف المنتج' }
    }
}

/** Duplicate a product with its prices (not variants, not images) */
export async function duplicateProduct(id: string) {
    try {
        const source = await prisma.product.findUnique({
            where: { id },
            include: {
                productPrices: true,
                category: { select: { code: true } },
                brandRef: { select: { code: true } },
            },
        })
        if (!source) return { success: false, error: 'المنتج غير موجود' }

        // Resolve codes for new product code
        const catCode = source.category?.code ?? null
        const brandCode = source.brandRef?.code ?? null

        const { id: _id, createdAt: _c, updatedAt: _u, productPrices: sourcePrices, productCode: _pc, category: _cat, brandRef: _br, ...sourceData } = source

        const duplicate = await prisma.$transaction(async (tx) => {
            const newProductCode = await generateProductCode(catCode, brandCode, tx)

            return await (tx.product as any).create({
                data: {
                    ...sourceData,
                    productCode: newProductCode,
                    itemNumber: null,  // duplicate has no manual itemNumber
                    name: `${source.name} (نسخة)`,
                    isAvailable: false,
                    productPrices: sourcePrices.length > 0 ? {
                        create: sourcePrices.map(pp => ({
                            priceLabelId: pp.priceLabelId,
                            currencyId: pp.currencyId,
                            value: pp.value,
                            unitId: pp.unitId,
                            isAutoCalculated: pp.isAutoCalculated,
                        }))
                    } : undefined,
                },
                include: PRODUCT_INCLUDE,
            })
        })

        revalidatePath('/inventory')
        return { success: true, data: serializeProduct(duplicate) }
    } catch (error: any) {
        console.error('Failed to duplicate product:', error)
        return { success: false, error: 'فشل نسخ المنتج' }
    }
}

/** Toggle product availability (isAvailable field) */
export async function toggleProductAvailability(id: string, currentStatus: boolean) {
    try {
        await prisma.product.update({
            where: { id },
            data: { isAvailable: !currentStatus },
        })
        const updated = await requireProduct(id)
        revalidateProduct(id)
        return { success: true, data: serializeProduct(updated) }
    } catch (error) {
        console.error('Failed to toggle availability:', error)
        return { success: false, error: 'فشل تحديث حالة التوفر' }
    }
}

/** Update product description only */
export async function updateProductDescription(id: string, description: string) {
    try {
        await prisma.product.update({
            where: { id },
            data: { description },
        })
        const updated = await requireProduct(id)
        revalidateProduct(id)
        return { success: true, data: serializeProduct(updated) }
    } catch (error) {
        console.error('Failed to update description:', error)
        return { success: false, error: 'فشل تحديث الوصف' }
    }
}
