'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VariantRecord = {
    id: string
    variantNumber: string
    suffix: string
    name: string
    type: string
    hex: string | null
    price: number | null
    order: number
    isDefault: boolean
}

export type VariantInput = {
    suffix: string
    name: string
    type?: string
    hex?: string | null
    price?: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function revalidateProduct(productId: string) {
    revalidatePath('/inventory')
    revalidatePath(`/inventory/${productId}`)
}

function buildVariantNumber(itemNumber: string, suffix: string): string {
    return `${itemNumber}-${suffix}`
}

// Suffix must be English letters or numbers only
const SUFFIX_REGEX = /^[a-zA-Z0-9]+$/

function mapRecord(v: any): VariantRecord {
    return {
        id: v.id,
        variantNumber: v.variantNumber,
        suffix: v.suffix,
        name: v.name,
        type: v.type,
        hex: v.hex,
        price: v.price,
        order: v.order,
        isDefault: v.isDefault,
    }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addVariant(
    productId: string,
    data: VariantInput
): Promise<{ success: boolean; data?: VariantRecord; error?: string }> {
    try {
        const suffix = data.suffix.trim()
        const name = data.name.trim()
        if (!suffix) return { success: false, error: 'رمز المتغير (الخانة الرابعة) مطلوب' }
        if (!SUFFIX_REGEX.test(suffix)) return { success: false, error: 'رمز المتغير يجب أن يحتوي على أرقام أو حروف إنجليزية فقط' }
        if (!name) return { success: false, error: 'اسم المتغير مطلوب' }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { itemNumber: true },
        })
        if (!product) return { success: false, error: 'المنتج غير موجود' }

        const variantNumber = buildVariantNumber(product.itemNumber, suffix)

        // Check uniqueness
        const existing = await prisma.variant.findFirst({
            where: { productId, suffix: { equals: suffix, mode: 'insensitive' } },
        })
        if (existing) return { success: false, error: 'هذا الرمز مستخدم بالفعل لهذا المنتج' }

        const existingGlobal = await prisma.variant.findUnique({ where: { variantNumber } })
        if (existingGlobal) return { success: false, error: `الرقم ${variantNumber} مستخدم بالفعل` }

        const count = await prisma.variant.count({ where: { productId } })

        const variant = await prisma.variant.create({
            data: {
                variantNumber,
                suffix,
                name,
                type: data.type || 'color',
                hex: data.hex?.trim() || null,
                price: data.price !== undefined ? data.price : null,
                order: count,
                isDefault: count === 0,
                productId,
            },
        })

        revalidateProduct(productId)
        return { success: true, data: mapRecord(variant) }
    } catch (error: any) {
        console.error('Failed to add variant:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا الرمز مستخدم بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة المتغير' }
    }
}

export async function removeVariant(
    variantId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const variant = await prisma.variant.findUnique({ where: { id: variantId } })
        if (!variant) return { success: false, error: 'المتغير غير موجود' }

        const { productId, isDefault } = variant

        await prisma.variant.delete({ where: { id: variantId } })

        // If deleted was default, make first remaining default
        if (isDefault) {
            const first = await prisma.variant.findFirst({
                where: { productId },
                orderBy: { order: 'asc' },
            })
            if (first) {
                await prisma.variant.update({
                    where: { id: first.id },
                    data: { isDefault: true },
                })
            }
        }

        // Re-order remaining
        const remaining = await prisma.variant.findMany({
            where: { productId },
            orderBy: { order: 'asc' },
        })
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].order !== i) {
                await prisma.variant.update({
                    where: { id: remaining[i].id },
                    data: { order: i },
                })
            }
        }

        revalidateProduct(productId)
        return { success: true }
    } catch (error: any) {
        console.error('Failed to remove variant:', error)
        return { success: false, error: error?.message ?? 'فشل حذف المتغير' }
    }
}

export async function updateVariant(
    variantId: string,
    data: Partial<VariantInput>
): Promise<{ success: boolean; data?: VariantRecord; error?: string }> {
    try {
        const variant = await prisma.variant.findUnique({
            where: { id: variantId },
            include: { product: { select: { itemNumber: true } } },
        })
        if (!variant) return { success: false, error: 'المتغير غير موجود' }

        const newSuffix = data.suffix?.trim() || variant.suffix
        const newName = data.name?.trim() || variant.name

        // Validate suffix format
        if (data.suffix && !SUFFIX_REGEX.test(newSuffix)) {
            return { success: false, error: 'رمز المتغير يجب أن يحتوي على أرقام أو حروف إنجليزية فقط' }
        }

        // If suffix changed, check uniqueness and rebuild variantNumber
        let newVariantNumber = variant.variantNumber
        if (newSuffix !== variant.suffix) {
            const dup = await prisma.variant.findFirst({
                where: { productId: variant.productId, suffix: { equals: newSuffix, mode: 'insensitive' }, id: { not: variantId } },
            })
            if (dup) return { success: false, error: 'هذا الرمز مستخدم بالفعل لهذا المنتج' }

            newVariantNumber = buildVariantNumber(variant.product.itemNumber, newSuffix)
            const globalDup = await prisma.variant.findFirst({
                where: { variantNumber: newVariantNumber, id: { not: variantId } },
            })
            if (globalDup) return { success: false, error: `الرقم ${newVariantNumber} مستخدم بالفعل` }
        }

        const updated = await prisma.variant.update({
            where: { id: variantId },
            data: {
                suffix: newSuffix,
                name: newName,
                variantNumber: newVariantNumber,
                type: data.type || undefined,
                hex: data.hex !== undefined ? (data.hex?.trim() || null) : undefined,
                price: data.price !== undefined ? data.price : undefined,
            },
        })

        revalidateProduct(variant.productId)
        return { success: true, data: mapRecord(updated) }
    } catch (error: any) {
        console.error('Failed to update variant:', error)
        return { success: false, error: error?.message ?? 'فشل تحديث المتغير' }
    }
}

export async function reorderVariants(
    variantIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await Promise.all(
            variantIds.map((id, index) =>
                prisma.variant.update({ where: { id }, data: { order: index } })
            )
        )

        if (variantIds.length > 0) {
            const first = await prisma.variant.findUnique({ where: { id: variantIds[0] } })
            if (first) revalidateProduct(first.productId)
        }

        return { success: true }
    } catch (error: any) {
        console.error('Failed to reorder variants:', error)
        return { success: false, error: 'فشل إعادة ترتيب المتغيرات' }
    }
}

// ─── Image Linking ────────────────────────────────────────────────────────────

export async function linkImagesToVariant(
    variantId: string,
    productImageIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await Promise.all(productImageIds.map(id => 
            prisma.productImage.update({
                where: { id },
                data: { variants: { connect: { id: variantId } } }
            })
        ))

        const variant = await prisma.variant.findUnique({ where: { id: variantId } })
        if (variant) revalidateProduct(variant.productId)
        return { success: true }
    } catch (error: any) {
        console.error('Failed to link images:', error)
        return { success: false, error: 'فشل ربط الصور بالمتغير' }
    }
}

export async function unlinkImagesFromVariant(
    variantId: string,
    productImageIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const first = await prisma.productImage.findFirst({
            where: { id: { in: productImageIds } },
        })

        await Promise.all(productImageIds.map(id => 
            prisma.productImage.update({
                where: { id },
                data: { variants: { disconnect: { id: variantId } } }
            })
        ))

        if (first) revalidateProduct(first.productId)
        return { success: true }
    } catch (error: any) {
        console.error('Failed to unlink images:', error)
        return { success: false, error: 'فشل فك ربط الصور' }
    }
}

