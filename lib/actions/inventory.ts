'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export type ImageEntry = { url?: string; alt?: string; isPrimary: boolean; order?: number; mediaImageId?: string }

// Serialized price entry returned to the client
export type SerializedPrice = {
    id: string
    priceLabelId: string
    priceLabelName: string
    currencyId: string
    currencySymbol: string
    currencyName: string
    value: number
    unit: string | null
    quantity: number | null
}

// Item number must be 3 segments separated by dashes (e.g. 001-BF-483)
const ITEM_NUMBER_REGEX = /^\S+-\S+-\S+$/

export interface ProductInput {
    itemNumber: string
    name: string
    brand?: string | null
    description?: string | null
    isAvailable?: boolean
    categoryId?: string | null
    alternativeNames?: string[]
    tags?: string[]
}

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

// Standard include for product queries
const PRODUCT_INCLUDE = {
    productImages: { include: { mediaImage: true, variants: { select: { id: true } } } },
    variants: {
        orderBy: { order: 'asc' as const },
        include: { variantImages: { include: { mediaImage: true } } },
    },
    productPrices: {
        include: {
            priceLabel: true,
            currency: true,
        },
        orderBy: { createdAt: 'asc' as const },
    },
}

function serializeProduct(product: any) {
    // Flatten productImages junction into flat image records
    const mediaImages = (product.productImages || []).map((pi: any) => ({
        id: pi.id,
        mediaImageId: pi.mediaImageId,
        url: pi.mediaImage.url,
        filename: pi.mediaImage.filename,
        alt: pi.mediaImage.alt,
        isPrimary: pi.isPrimary,
        order: pi.order,
        width: pi.mediaImage.width,
        height: pi.mediaImage.height,
        sizeBytes: pi.mediaImage.sizeBytes,
        variantIds: (pi.variants || []).map((v: any) => v.id),
    }))

    // Variants with their linked images
    const variants = (product.variants || []).map((v: any) => ({
        id: v.id,
        variantNumber: v.variantNumber,
        suffix: v.suffix,
        name: v.name,
        type: v.type,
        hex: v.hex,
        order: v.order,
        isDefault: v.isDefault,
        imageCount: (v.variantImages || []).length,
        images: (v.variantImages || []).map((vi: any) => ({
            id: vi.id,
            url: vi.mediaImage.url,
            filename: vi.mediaImage.filename,
            alt: vi.mediaImage.alt,
        })),
    }))

    const { productImages: _, variants: __, productPrices: _pp, ...rest } = product

    // Serialize productPrices into a flat array
    const productPrices: SerializedPrice[] = (product.productPrices || []).map((pp: any) => ({
        id: pp.id,
        priceLabelId: pp.priceLabelId,
        priceLabelName: pp.priceLabel.name,
        currencyId: pp.currencyId,
        currencySymbol: pp.currency.symbol,
        currencyName: pp.currency.name,
        value: pp.value,
        unit: pp.unit,
        quantity: pp.quantity,
    }))

    return {
        ...rest,
        variants,
        mediaImages,
        productPrices,
    }
}

/** Fetch a raw product by id (throws if not found) */
async function requireProduct(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma
    const product = await prisma.product.findUnique({ 
        where: { id },
        include: PRODUCT_INCLUDE,
    })
    if (!product) throw new Error('المنتج غير موجود')
    return product
}

function revalidateProduct(id: string) {
    revalidatePath('/inventory')
    revalidatePath(`/inventory/${id}`)
}

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            include: PRODUCT_INCLUDE,
        })
        return { success: true, data: products.map(serializeProduct) }
    } catch (error) {
        console.error('Failed to fetch products:', error)
        return { success: false, error: 'فشل جلب المنتجات', data: [] }
    }
}

export async function getProductById(id: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: PRODUCT_INCLUDE,
        })
        if (!product) return { success: false, error: 'المنتج غير موجود', data: null }
        return { success: true, data: serializeProduct(product) }
    } catch (error) {
        console.error('Failed to fetch product:', error)
        return { success: false, error: 'فشل جلب المنتج', data: null }
    }
}



export async function searchProducts(query: string) {
    try {
        const q = query.trim()
        if (!q) return getProducts()

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { itemNumber: { contains: q, mode: 'insensitive' } },
                    { brand: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            },
            orderBy: { name: 'asc' },
            include: PRODUCT_INCLUDE,
        })
        return { success: true, data: products.map(serializeProduct) }
    } catch (error) {
        console.error('Failed to search products:', error)
        return { success: false, error: 'فشل البحث عن المنتجات', data: [] }
    }
}

// ─────────────────────────────────────────────
// PRODUCT CRUD
// ─────────────────────────────────────────────

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

export async function updateProduct(id: string, data: Partial<ProductInput>) {
    try {
        const { alternativeNames, tags, ...productData } = data as any

        // Validate itemNumber format if provided
        if (productData.itemNumber && !ITEM_NUMBER_REGEX.test(productData.itemNumber.trim())) {
            return { success: false, error: 'رقم الصنف يجب أن يتكون من 3 خانات مفصولة بشرطات (مثال: 001-BF-483)' }
        }

        // Handle itemNumber change → move images folder + update variant numbers
        if (productData.itemNumber) {
            const current = await prisma.product.findUnique({
                where: { id },
                select: { itemNumber: true, variants: true },
            })
            if (current && current.itemNumber !== productData.itemNumber) {
                const { moveProductImages } = await import('./upload')
                await moveProductImages(current.itemNumber, productData.itemNumber)

                // Update all variant numbers
                for (const v of current.variants) {
                    await prisma.variant.update({
                        where: { id: v.id },
                        data: { variantNumber: `${productData.itemNumber}-${v.suffix}` },
                    })
                }
            }
        }

        const product = await (prisma.product as any).update({
            where: { id },
            data: {
                ...productData,
                alternativeNames: alternativeNames !== undefined ? (alternativeNames?.length ? alternativeNames : Prisma.JsonNull) : undefined,
                tags: tags !== undefined ? (tags?.length ? tags : Prisma.JsonNull) : undefined,
            },
            include: PRODUCT_INCLUDE,
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${id}`)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product:', error)
        if (error?.code === 'P2002') return { success: false, error: 'رقم الصنف مستخدم بالفعل' }
        return { success: false, error: 'فشل تحديث المنتج' }
    }
}

export async function deleteProduct(id: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            select: { itemNumber: true }
        })

        await prisma.product.delete({ where: { id } })

        // Clean up product images folder
        if (product?.itemNumber) {
            try {
                const { deleteProductFolder } = await import('./upload')
                await deleteProductFolder(product.itemNumber)
            } catch {
                // Non-fatal: images cleanup failure shouldn't block deletion
            }
        }

        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'فشل حذف المنتج' }
    }
}

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
                        unit: pp.unit,
                        quantity: pp.quantity,
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

export async function toggleProductAvailability(id: string, currentStatus: boolean) {
    try {
        const updated = await prisma.product.update({
            where: { id },
            data: { isAvailable: !currentStatus },
        })
        revalidatePath('/inventory')
        revalidatePath(`/inventory/${id}`)
        return { success: true, data: serializeProduct(updated) }
    } catch (error) {
        console.error('Failed to toggle availability:', error)
        return { success: false, error: 'فشل تحديث حالة التوفر' }
    }
}

export async function updateProductDescription(id: string, description: string) {
    try {
        const updated = await prisma.product.update({
            where: { id },
            data: { description },
        })
        revalidateProduct(id)
        return { success: true, data: serializeProduct(updated) }
    } catch (error) {
        console.error('Failed to update description:', error)
        return { success: false, error: 'فشل تحديث الوصف' }
    }
}

// ─────────────────────────────────────────────────
// PRODUCT PRICES CRUD (via ProductPrice table)
// ─────────────────────────────────────────────────

export async function addProductPrice(productId: string, data: {
    priceLabelId: string
    currencyId: string
    value: number
    unit?: string
    quantity?: number
}) {
    try {
        if (isNaN(data.value) || data.value < 0) return { success: false, error: 'القيمة غير صحيحة' }
        if (!data.priceLabelId) return { success: false, error: 'مسمى التسعيرة مطلوب' }
        if (!data.currencyId) return { success: false, error: 'العملة مطلوبة' }

        await prisma.productPrice.create({
            data: {
                productId,
                priceLabelId: data.priceLabelId,
                currencyId: data.currencyId,
                value: data.value,
                unit: data.unit?.trim() || null,
                quantity: data.quantity || null,
            },
        })

        // Re-fetch full product to return consistent data
        const product = await requireProduct(productId)
        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to add product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + العملة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل إضافة السعر' }
    }
}

export async function updateProductPrice(priceId: string, data: {
    value?: number
    unit?: string | null
    quantity?: number | null
    priceLabelId?: string
    currencyId?: string
}) {
    try {
        if (data.value !== undefined && (isNaN(data.value) || data.value < 0)) {
            return { success: false, error: 'القيمة غير صحيحة' }
        }

        const existing = await prisma.productPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        await prisma.productPrice.update({
            where: { id: priceId },
            data: {
                value: data.value,
                unit: data.unit !== undefined ? (data.unit?.trim() || null) : undefined,
                quantity: data.quantity !== undefined ? (data.quantity || null) : undefined,
                priceLabelId: data.priceLabelId,
                currencyId: data.currencyId,
            },
        })

        const product = await requireProduct(existing.productId)
        revalidatePath('/inventory')
        revalidatePath(`/inventory/${existing.productId}`)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to update product price:', error)
        if (error?.code === 'P2002') return { success: false, error: 'هذا التسعير (المسمى + العملة) موجود بالفعل' }
        return { success: false, error: error?.message ?? 'فشل تحديث السعر' }
    }
}

export async function deleteProductPrice(priceId: string) {
    try {
        const existing = await prisma.productPrice.findUnique({ where: { id: priceId } })
        if (!existing) return { success: false, error: 'السعر غير موجود' }

        await prisma.productPrice.delete({ where: { id: priceId } })

        const product = await requireProduct(existing.productId)
        revalidatePath('/inventory')
        revalidatePath(`/inventory/${existing.productId}`)
        return { success: true, data: serializeProduct(product) }
    } catch (error: any) {
        console.error('Failed to delete product price:', error)
        return { success: false, error: error?.message ?? 'فشل حذف السعر' }
    }
}

// ─────────────────────────────────────────────
// ALTERNATIVE NAMES CRUD
// ─────────────────────────────────────────────

export async function addAlternativeNameToProduct(productId: string, newName: string) {
    try {
        const trimmed = newName.trim()
        if (!trimmed) return { success: false, error: 'الاسم البديل لا يمكن أن يكون فارغاً' }

        const product = await requireProduct(productId)
        const current = (product.alternativeNames as string[]) ?? []

        if (current.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'هذا الاسم البديل موجود بالفعل' }
        }

        const updated = await prisma.product.update({
            where: { id: productId },
            data: { alternativeNames: [...current, trimmed] as any },
        })

        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to add alternative name:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الاسم البديل' }
    }
}

export async function removeAlternativeNameFromProduct(productId: string, name: string) {
    try {
        const product = await requireProduct(productId)
        const current = (product.alternativeNames as string[]) ?? []
        const remaining = current.filter(n => n !== name)

        if (remaining.length === current.length) {
            return { success: false, error: 'الاسم البديل غير موجود' }
        }

        const updated = await prisma.product.update({
            where: { id: productId },
            data: { alternativeNames: remaining.length ? (remaining as any) : Prisma.JsonNull },
        })

        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to remove alternative name:', error)
        return { success: false, error: error?.message ?? 'فشل حذف الاسم البديل' }
    }
}

// ─────────────────────────────────────────────
// TAGS CRUD
// ─────────────────────────────────────────────

export async function addTagToProduct(productId: string, newTag: string) {
    try {
        const trimmed = newTag.trim()
        if (!trimmed) return { success: false, error: 'الوسم لا يمكن أن يكون فارغاً' }

        const product = await requireProduct(productId)
        const current = (product.tags as string[]) ?? []

        if (current.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'هذا الوسم موجود بالفعل' }
        }

        const updated = await prisma.product.update({
            where: { id: productId },
            data: { tags: [...current, trimmed] as any },
        })

        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to add tag:', error)
        return { success: false, error: error?.message ?? 'فشل إضافة الوسم' }
    }
}

export async function removeTagFromProduct(productId: string, tag: string) {
    try {
        const product = await requireProduct(productId)
        const current = (product.tags as string[]) ?? []
        const remaining = current.filter(t => t !== tag)

        if (remaining.length === current.length) {
            return { success: false, error: 'الوسم غير موجود' }
        }

        const updated = await prisma.product.update({
            where: { id: productId },
            data: { tags: remaining.length ? (remaining as any) : Prisma.JsonNull },
        })

        revalidateProduct(productId)
        return { success: true, data: serializeProduct(updated) }
    } catch (error: any) {
        console.error('Failed to remove tag:', error)
        return { success: false, error: error?.message ?? 'فشل حذف الوسم' }
    }
}

