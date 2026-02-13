'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function toggleProductAvailability(id: string, currentStatus: boolean) {
    try {
        const updatedProduct = await prisma.product.update({
            where: { id },
            data: { isAvailable: !currentStatus },
        })

        revalidatePath('/inventory')

        return {
            success: true,
            data: {
                ...updatedProduct,
                price: Number(updatedProduct.price)
            }
        }
    } catch (error) {
        console.error('Failed to toggle availability:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

export async function updateProductDescription(id: string, description: string) {
    try {
        const updatedProduct = await prisma.product.update({
            where: { id },
            data: { description },
        })

        revalidatePath('/inventory')
        return {
            success: true,
            data: {
                ...updatedProduct,
                price: Number(updatedProduct.price)
            }
        }
    } catch (error) {
        console.error('Failed to update description:', error)
        return { success: false, error: 'Failed to update description' }
    }
}

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            include: {
                variants: true,
                category: true
            },
            orderBy: { createdAt: 'desc' },
        })

        // Serialize Decimal types to numbers for Client Components
        const serializedProducts = products.map(product => ({
            ...product,
            price: Number(product.price),
            variants: product.variants.map(v => ({
                ...v,
                price: v.price ? Number(v.price) : null
            }))
        }))

        return { success: true, data: serializedProducts }
    } catch (error) {
        console.error('Failed to fetch products:', error)
        return { success: false, error: 'Failed to fetch products', data: [] }
    }
}

export async function getProductById(id: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                variants: {
                    orderBy: { createdAt: 'asc' }
                },
                category: true
            }
        })

        if (!product) {
            return { success: false, error: 'Product not found', data: null }
        }

        // Convert Decimal to string for serialization
        const serializedProduct = {
            ...product,
            price: product.price.toString(),
            variants: product.variants.map(v => ({
                ...v,
                price: v.price?.toString() || null
            }))
        }

        return { success: true, data: serializedProduct }
    } catch (error) {
        console.error('Failed to fetch product:', error)
        return { success: false, error: 'Failed to fetch product', data: null }
    }
}

export async function createProduct(data: any) {
    try {
        const { variants, colors, alternativeNames, ...productData } = data
        const product = await prisma.product.create({
            data: {
                ...productData,
                price: parseFloat(productData.price),
                colors: colors || null,
                alternativeNames: alternativeNames || null,
                variants: variants?.length > 0 ? {
                    create: variants.map((v: any) => ({
                        name: v.name,
                        imagePath: v.imagePath,
                        price: v.price ? parseFloat(v.price) : null,
                    }))
                } : undefined
            }
        })
        revalidatePath('/inventory')
        return {
            success: true,
            data: {
                ...product,
                price: Number(product.price)
            }
        }
    } catch (error) {
        console.error('Failed to create product:', error)
        return { success: false, error: 'Failed to create product' }
    }
}

export async function updateProduct(id: string, data: any) {
    try {
        const { variants, colors, alternativeNames, categoryId, category, ...productData } = data

        // Use a transaction to update product and its variants
        const product = await prisma.$transaction(async (tx) => {
            // Delete variants not in the new list
            const currentVariants = await tx.variant.findMany({ where: { productId: id } })
            const currentVariantIds = currentVariants.map(v => v.id)
            const incomingVariantIds = variants?.filter((v: any) => v.id).map((v: any) => v.id) || []

            const variantIdsToDelete = currentVariantIds.filter(vid => !incomingVariantIds.includes(vid))

            if (variantIdsToDelete.length > 0) {
                await tx.variant.deleteMany({
                    where: { id: { in: variantIdsToDelete } }
                })
            }

            // Create or update incoming variants
            if (variants && variants.length > 0) {
                for (const v of variants) {
                    if (v.id) {
                        await tx.variant.update({
                            where: { id: v.id },
                            data: {
                                name: v.name,
                                imagePath: v.imagePath,
                                price: v.price ? parseFloat(v.price) : null,
                            }
                        })
                    } else {
                        await tx.variant.create({
                            data: {
                                productId: id,
                                name: v.name,
                                imagePath: v.imagePath,
                                price: v.price ? parseFloat(v.price) : null,
                            }
                        })
                    }
                }
            }

            return await tx.product.update({
                where: { id },
                data: {
                    ...productData,
                    price: parseFloat(productData.price),
                    colors: colors || null,
                    alternativeNames: alternativeNames || null,
                    category: categoryId ? {
                        connect: { id: categoryId }
                    } : undefined,
                },
                include: { variants: true }
            })
        })

        revalidatePath('/inventory')
        return {
            success: true,
            data: {
                ...product,
                price: Number(product.price),
                variants: product.variants?.map(v => ({
                    ...v,
                    price: v.price ? Number(v.price) : null
                })) || []
            }
        }
    } catch (error) {
        console.error('Failed to update product:', error)
        return { success: false, error: 'Failed to update product' }
    }
}
export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({
            where: { id },
        })
        revalidatePath('/inventory')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'Failed to delete product' }
    }
}

export async function addAlternativeNameToProduct(productId: string, newAlternativeName: string) {
    try {
        // Validate input
        const trimmedName = newAlternativeName.trim()
        if (!trimmedName) {
            return { success: false, error: 'الاسم البديل لا يمكن أن يكون فارغاً' }
        }

        // Get current product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return { success: false, error: 'المنتج غير موجود' }
        }

        // Get current alternative names
        const currentNames = (product.alternativeNames as string[]) || []

        // Check for duplicates
        if (currentNames.some(name => name.toLowerCase() === trimmedName.toLowerCase())) {
            return { success: false, error: 'هذا الاسم البديل موجود بالفعل' }
        }

        // Add new name
        const updatedNames = [...currentNames, trimmedName]

        // Update product
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { alternativeNames: updatedNames }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return {
            success: true,
            data: {
                ...updatedProduct,
                price: Number(updatedProduct.price)
            }
        }
    } catch (error) {
        console.error('Failed to add alternative name:', error)
        return { success: false, error: 'فشل إضافة الاسم البديل' }
    }
}

export async function addColorToProduct(
    productId: string,
    colorData: { name: string; code: string; imagePath?: string }
) {
    try {
        // Validate input
        const trimmedName = colorData.name.trim()
        const trimmedCode = colorData.code.trim()

        if (!trimmedName) {
            return { success: false, error: 'اسم اللون لا يمكن أن يكون فارغاً' }
        }

        if (!trimmedCode) {
            return { success: false, error: 'كود اللون لا يمكن أن يكون فارغاً' }
        }

        // Validate hex color code
        const hexRegex = /^#[0-9A-Fa-f]{6}$/
        if (!hexRegex.test(trimmedCode)) {
            return { success: false, error: 'كود اللون يجب أن يكون بصيغة hex صحيحة (مثال: #ff0000)' }
        }

        // Get current product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return { success: false, error: 'المنتج غير موجود' }
        }

        // Get current colors
        const currentColors = (product.colors as any[]) || []

        // Check for duplicates
        const isDuplicateName = currentColors.some(
            (color: any) => color.name.toLowerCase() === trimmedName.toLowerCase()
        )
        if (isDuplicateName) {
            return { success: false, error: 'هذا اللون موجود بالفعل' }
        }

        const isDuplicateCode = currentColors.some(
            (color: any) => color.code.toLowerCase() === trimmedCode.toLowerCase()
        )
        if (isDuplicateCode) {
            return { success: false, error: 'كود اللون هذا مستخدم بالفعل' }
        }

        // Add new color
        const newColor = {
            name: trimmedName,
            code: trimmedCode,
            imagePath: colorData.imagePath || null
        }
        const updatedColors = [...currentColors, newColor]

        // Update product
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { colors: updatedColors }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return {
            success: true,
            data: {
                ...updatedProduct,
                price: Number(updatedProduct.price)
            }
        }
    } catch (error) {
        console.error('Failed to add color:', error)
        return { success: false, error: 'فشل إضافة اللون' }
    }
}

export async function addVariantToProduct(
    productId: string,
    variantData: { name: string; price?: string; imagePath?: string }
) {
    try {
        // Validate input
        const trimmedName = variantData.name.trim()

        if (!trimmedName) {
            return { success: false, error: 'اسم الخيار لا يمكن أن يكون فارغاً' }
        }

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { variants: true }
        })

        if (!product) {
            return { success: false, error: 'المنتج غير موجود' }
        }

        // Check for duplicate variant name
        const isDuplicate = product.variants.some(
            (v) => v.name.toLowerCase() === trimmedName.toLowerCase()
        )
        if (isDuplicate) {
            return { success: false, error: 'خيار بنفس الاسم موجود بالفعل' }
        }

        // Parse price if provided
        const parsedPrice = variantData.price ? parseFloat(variantData.price) : null

        // Create variant
        const newVariant = await prisma.variant.create({
            data: {
                productId: productId,
                name: trimmedName,
                price: parsedPrice,
                imagePath: variantData.imagePath || null
            }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return {
            success: true,
            data: {
                ...newVariant,
                price: newVariant.price ? Number(newVariant.price) : null
            }
        }
    } catch (error) {
        console.error('Failed to add variant:', error)
        return { success: false, error: 'فشل إضافة الخيار' }
    }
}
