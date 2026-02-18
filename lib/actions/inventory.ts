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
        const { variants, colors, alternativeNames, images, ...productData } = data

        // Auto-sync imagePath from primary image
        const primaryImage = images?.find((i: any) => i.isPrimary) || images?.[0]
        if (primaryImage?.url && !productData.imagePath) {
            productData.imagePath = primaryImage.url
        }

        const product = await prisma.product.create({
            data: {
                ...productData,
                price: parseFloat(productData.price),
                colors: colors || null,
                alternativeNames: alternativeNames || null,
                images: images?.length > 0 ? images : null,
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
        const { variants, colors, alternativeNames, images, categoryId, category, ...productData } = data

        // Auto-sync imagePath from primary image
        const primaryImage = images?.find((i: any) => i.isPrimary) || images?.[0]
        if (primaryImage?.url) {
            productData.imagePath = primaryImage.url
        } else if (images?.length === 0) {
            productData.imagePath = null
        }

        // Handle itemNumber change: move images folder
        if (productData.itemNumber) {
            const currentProduct = await prisma.product.findUnique({
                where: { id },
                select: { itemNumber: true }
            })
            if (currentProduct && currentProduct.itemNumber !== productData.itemNumber) {
                const { moveProductImages } = await import('./upload')
                await moveProductImages(currentProduct.itemNumber, productData.itemNumber)
            }
        }

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
                    images: images?.length > 0 ? images : null,
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
    colorData: { itemNumber: string; name: string; code: string; imagePath?: string }
) {
    try {
        // Validate input
        const trimmedItemNumber = colorData.itemNumber.trim()
        const trimmedName = colorData.name.trim()
        const trimmedCode = colorData.code.trim()

        if (!trimmedItemNumber) {
            return { success: false, error: '\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0641\u0627\u0631\u063a\u0627\u064b' }
        }

        if (!trimmedName) {
            return { success: false, error: '\u0627\u0633\u0645 \u0627\u0644\u0644\u0648\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0641\u0627\u0631\u063a\u0627\u064b' }
        }

        if (!trimmedCode) {
            return { success: false, error: '\u0643\u0648\u062f \u0627\u0644\u0644\u0648\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0641\u0627\u0631\u063a\u0627\u064b' }
        }

        // Validate hex color code
        const hexRegex = /^#[0-9A-Fa-f]{6}$/
        if (!hexRegex.test(trimmedCode)) {
            return { success: false, error: '\u0643\u0648\u062f \u0627\u0644\u0644\u0648\u0646 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0628\u0635\u064a\u063a\u0629 hex \u0635\u062d\u064a\u062d\u0629 (\u0645\u062b\u0627\u0644: #ff0000)' }
        }

        // Get current product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return { success: false, error: '\u0627\u0644\u0645\u0646\u062a\u062c \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' }
        }

        // Get current colors
        const currentColors = (product.colors as any[]) || []

        // Check if itemNumber already exists
        const itemNumberExists = currentColors.some(
            (color: any) => color.itemNumber === trimmedItemNumber
        )
        if (itemNumberExists) {
            return { success: false, error: '\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u0646 \u0645\u0648\u062c\u0648\u062f \u0628\u0627\u0644\u0641\u0639\u0644' }
        }

        // Check for duplicate name
        const isDuplicateName = currentColors.some(
            (color: any) => color.name.toLowerCase() === trimmedName.toLowerCase()
        )
        if (isDuplicateName) {
            return { success: false, error: '\u0647\u0630\u0627 \u0627\u0644\u0644\u0648\u0646 \u0645\u0648\u062c\u0648\u062f \u0628\u0627\u0644\u0641\u0639\u0644' }
        }

        // Check for duplicate code
        const isDuplicateCode = currentColors.some(
            (color: any) => color.code.toLowerCase() === trimmedCode.toLowerCase()
        )
        if (isDuplicateCode) {
            return { success: false, error: '\u0643\u0648\u062f \u0627\u0644\u0644\u0648\u0646 \u0647\u0630\u0627 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644' }
        }

        // Add new color with itemNumber
        const newColor = {
            itemNumber: trimmedItemNumber,
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
        return { success: false, error: '\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0644\u0648\u0646' }
    }
}


/**
 * Update color in product by itemNumber
 */
export async function updateColorInProduct(
    productId: string,
    colorItemNumber: string,
    colorData: { itemNumber?: string; name?: string; code?: string; imagePath?: string | null }
) {
    try {
        // Get current product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return { success: false, error: '\u0627\u0644\u0645\u0646\u062a\u062c \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' }
        }

        // Get current colors
        const currentColors = (product.colors as any[]) || []

        // Find color index
        const colorIndex = currentColors.findIndex(
            (color: any) => color.itemNumber === colorItemNumber
        )

        if (colorIndex === -1) {
            return { success: false, error: '\u0627\u0644\u0644\u0648\u0646 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' }
        }

        // Get current color
        const currentColor = currentColors[colorIndex]

        // Validate itemNumber if provided
        if (colorData.itemNumber !== undefined) {
            const trimmedItemNumber = colorData.itemNumber.trim()
            if (!trimmedItemNumber) {
                return { success: false, error: '\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0641\u0627\u0631\u063a\u0627\u064b' }
            }

            // Check if new itemNumber already exists (excluding current color)
            const itemNumberExists = currentColors.some(
                (color: any, idx: number) =>
                    idx !== colorIndex &&
                    color.itemNumber === trimmedItemNumber
            )
            if (itemNumberExists) {
                return { success: false, error: '\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u0646 \u0645\u0648\u062c\u0648\u062f \u0628\u0627\u0644\u0641\u0639\u0644' }
            }
        }

        // Validate name if provided
        if (colorData.name !== undefined) {
            const trimmedName = colorData.name.trim()
            if (!trimmedName) {
                return { success: false, error: '\u0627\u0633\u0645 \u0627\u0644\u0644\u0648\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0641\u0627\u0631\u063a\u0627\u064b' }
            }

            // Check for duplicate name (excluding current color)
            const isDuplicateName = currentColors.some(
                (color: any, idx: number) =>
                    idx !== colorIndex &&
                    color.name.toLowerCase() === trimmedName.toLowerCase()
            )
            if (isDuplicateName) {
                return { success: false, error: '\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u0645 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644' }
            }
        }

        // Validate code if provided
        if (colorData.code !== undefined) {
            const trimmedCode = colorData.code.trim()
            if (!trimmedCode) {
                return { success: false, error: '\u0643\u0648\u062f \u0627\u0644\u0644\u0648\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0641\u0627\u0631\u063a\u0627\u064b' }
            }

            // Validate hex color code
            const hexRegex = /^#[0-9A-Fa-f]{6}$/
            if (!hexRegex.test(trimmedCode)) {
                return { success: false, error: '\u0643\u0648\u062f \u0627\u0644\u0644\u0648\u0646 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0628\u0635\u064a\u063a\u0629 hex \u0635\u062d\u064a\u062d\u0629 (\u0645\u062b\u0627\u0644: #ff0000)' }
            }

            // Check for duplicate code (excluding current color)
            const isDuplicateCode = currentColors.some(
                (color: any, idx: number) =>
                    idx !== colorIndex &&
                    color.code.toLowerCase() === trimmedCode.toLowerCase()
            )
            if (isDuplicateCode) {
                return { success: false, error: '\u0643\u0648\u062f \u0627\u0644\u0644\u0648\u0646 \u0647\u0630\u0627 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644' }
            }
        }

        // Update color
        const updatedColor = {
            ...currentColor,
            itemNumber: colorData.itemNumber !== undefined ? colorData.itemNumber.trim() : currentColor.itemNumber,
            name: colorData.name !== undefined ? colorData.name.trim() : currentColor.name,
            code: colorData.code !== undefined ? colorData.code.trim() : currentColor.code,
            imagePath: colorData.imagePath !== undefined ? colorData.imagePath : currentColor.imagePath
        }

        // Update colors array
        const updatedColors = [...currentColors]
        updatedColors[colorIndex] = updatedColor

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
        console.error('Failed to update color:', error)
        return { success: false, error: '\u0641\u0634\u0644 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0644\u0648\u0646' }
    }
}


/**
 * Delete color from product by itemNumber
 */
export async function deleteColorFromProduct(
    productId: string,
    colorItemNumber: string
) {
    try {
        // Get current product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return { success: false, error: 'المنتج غير موجود' }
        }

        // Get current colors
        const currentColors = (product.colors as any[]) || []

        // Find color
        const colorToDelete = currentColors.find(
            (color: any) => color.itemNumber === colorItemNumber
        )

        if (!colorToDelete) {
            return { success: false, error: 'اللون غير موجود' }
        }

        // Delete color image if exists
        if (colorToDelete.imagePath) {
            const { deleteOldImage } = await import('./upload')
            await deleteOldImage(colorToDelete.imagePath)
        }

        // Remove color from array
        const updatedColors = currentColors.filter(
            (color: any) => color.itemNumber !== colorItemNumber
        )

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
        console.error('Failed to delete color:', error)
        return { success: false, error: 'فشل حذف اللون' }
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
