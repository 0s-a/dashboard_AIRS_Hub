'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma, PRODUCT_INCLUDE, ITEM_NUMBER_REGEX, serializeProduct, revalidateProduct, requireProduct } from './_shared'
import type { ProductInput } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// WRITE — Product CRUD Actions
// ─────────────────────────────────────────────────────────────

/** Create a new product */
export async function createProduct(data: ProductInput) {
    try {
        if (!data.itemNumber?.trim()) return { success: false, error: 'رقم الصنف مطلوب' }
        if (!data.name?.trim()) return { success: false, error: 'اسم المنتج مطلوب' }
        if (!ITEM_NUMBER_REGEX.test(data.itemNumber.trim())) {
            return { success: false, error: 'رقم الصنف يجب أن يتكون من 3 خانات مفصولة بشرطات (مثال: 001-BF-483)' }
        }

        const { alternativeNames, tags, ...productData } = data

        const product = await (prisma.product as any).create({
            data: {
                ...productData,
                itemNumber: productData.itemNumber.trim(),
                name: productData.name.trim(),
                alternativeNames: alternativeNames?.length ? alternativeNames : Prisma.JsonNull,
                tags: tags?.length ? tags : Prisma.JsonNull,
            },
            include: PRODUCT_INCLUDE,
        })

        revalidatePath('/inventory')
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to create product:', error)
        if (error?.code === 'P2002') return { success: false, error: 'رقم الصنف مستخدم بالفعل' }
        return { success: false, error: 'فشل إنشاء المنتج' }
    }
}

/** Update product fields. Handles itemNumber cascading to variants + filesystem folder rename. */
export async function updateProduct(id: string, data: Partial<ProductInput>) {
    try {
        const { alternativeNames, tags, ...productData } = data as any

        if (productData.itemNumber && !ITEM_NUMBER_REGEX.test(productData.itemNumber.trim())) {
            return { success: false, error: 'رقم الصنف يجب أن يتكون من 3 خانات مفصولة بشرطات (مثال: 001-BF-483)' }
        }

        // ── Detect itemNumber change ─────────────────────────────────
        let oldItemNumber: string | null = null
        let newItemNumber: string | null = null

        if (productData.itemNumber) {
            const current = await prisma.product.findUnique({
                where: { id },
                select: { itemNumber: true },
            })
            if (current && current.itemNumber !== productData.itemNumber) {
                oldItemNumber = current.itemNumber
                newItemNumber = productData.itemNumber
            }
        }

        // ── Transaction: update variants then product ─────────────────
        const product = await prisma.$transaction(async (tx) => {
            // 1️⃣ Update variant numbers (must happen while old itemNumber is still valid)
            if (oldItemNumber && newItemNumber) {
                const variants = await tx.variant.findMany({
                    where: { productId: id },
                    select: { id: true, suffix: true },
                })
                await Promise.all(
                    variants.map((v) =>
                        tx.variant.update({
                            where: { id: v.id },
                            data: { variantNumber: `${newItemNumber}-${v.suffix}` },
                        })
                    )
                )
            }

            // 2️⃣ Update the product itself
            return await (tx.product as any).update({
                where: { id },
                data: {
                    ...productData,
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

        // ── Non-fatal: move filesystem folder after DB commit ─────────
        if (oldItemNumber && newItemNumber) {
            try {
                const { moveProductImages } = await import('../upload')
                await moveProductImages(oldItemNumber, newItemNumber)
            } catch (fsError) {
                console.error(
                    `[updateProduct] DB updated but folder rename failed: ${oldItemNumber} → ${newItemNumber}`,
                    fsError
                )
            }
        }

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
            select: { itemNumber: true }
        })

        if (!product) return { success: false, error: 'المنتج غير موجود أو تم حذفه بالفعل' }

        await prisma.product.delete({ where: { id } })

        if (product?.itemNumber) {
            try {
                const { deleteProductFolder } = await import('../upload')
                await deleteProductFolder(product.itemNumber)
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
            include: { productPrices: true },
        })
        if (!source) return { success: false, error: 'المنتج غير موجود' }

        const newItemNumber = `${source.itemNumber}-copy-${Date.now().toString(36).slice(-4)}`
        const { id: _id, createdAt: _c, updatedAt: _u, productPrices: sourcePrices, ...sourceData } = source

        const duplicate = await (prisma.product as any).create({
            data: {
                ...sourceData,
                itemNumber: newItemNumber,
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
