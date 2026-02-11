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

        return { success: true, data: updatedProduct }
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
        return { success: true, data: updatedProduct }
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
        return { success: true, data: products }
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

        return { success: true, data: product }
    } catch (error) {
        console.error('Failed to fetch product:', error)
        return { success: false, error: 'Failed to fetch product', data: null }
    }
}

export async function createProduct(data: any) {
    try {
        const { variants, ...productData } = data
        const product = await prisma.product.create({
            data: {
                ...productData,
                price: parseFloat(productData.price),
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
        return { success: true, data: product }
    } catch (error) {
        console.error('Failed to create product:', error)
        return { success: false, error: 'Failed to create product' }
    }
}

export async function updateProduct(id: string, data: any) {
    try {
        const { variants, ...productData } = data

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
                },
                include: { variants: true }
            })
        })

        revalidatePath('/inventory')
        return { success: true, data: product }
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
