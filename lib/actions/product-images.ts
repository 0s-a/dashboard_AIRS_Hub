'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { ProductImage } from '@/lib/types/product'
import { validateProductImages } from '@/lib/types/product'

/**
 * Add image to product
 */
export async function addProductImage(
    productId: string,
    image: ProductImage
) {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { images: true }
        })

        if (!product) {
            return { success: false, error: '\u0627\u0644\u0645\u0646\u062a\u062c \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' }
        }

        const currentImages = (product.images as ProductImage[]) || []

        // If this is the first image or should be primary, adjust
        if (currentImages.length === 0) {
            image.isPrimary = true
        } else if (image.isPrimary) {
            // Remove isPrimary from other images
            currentImages.forEach(img => img.isPrimary = false)
        }

        const updatedImages = [...currentImages, image]

        // Validate
        const validation = validateProductImages(updatedImages)
        if (!validation.valid) {
            return { success: false, error: validation.error }
        }

        await prisma.product.update({
            where: { id: productId },
            data: { images: updatedImages as any }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return { success: true }
    } catch (error) {
        console.error('Failed to add product image:', error)
        return { success: false, error: '\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0635\u0648\u0631\u0629' }
    }
}

/**
 * Remove image from product
 */
export async function removeProductImage(
    productId: string,
    imageUrl: string
) {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { images: true }
        })

        if (!product) {
            return { success: false, error: '\u0627\u0644\u0645\u0646\u062a\u062c \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' }
        }

        const currentImages = (product.images as ProductImage[]) || []
        const imageToRemove = currentImages.find(img => img.url === imageUrl)

        if (!imageToRemove) {
            return { success: false, error: '\u0627\u0644\u0635\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629' }
        }

        const updatedImages = currentImages.filter(img => img.url !== imageUrl)

        // If removed image was primary and there are other images, make first one primary
        if (imageToRemove.isPrimary && updatedImages.length > 0) {
            updatedImages[0].isPrimary = true
        }

        await prisma.product.update({
            where: { id: productId },
            data: { images: updatedImages.length > 0 ? updatedImages as any : null }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return { success: true }
    } catch (error) {
        console.error('Failed to remove product image:', error)
        return { success: false, error: '\u0641\u0634\u0644 \u062d\u0630\u0641 \u0627\u0644\u0635\u0648\u0631\u0629' }
    }
}

/**
 * Set primary product image
 */
export async function setPrimaryProductImage(
    productId: string,
    imageUrl: string
) {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { images: true }
        })

        if (!product) {
            return { success: false, error: '\u0627\u0644\u0645\u0646\u062a\u062c \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' }
        }

        const currentImages = (product.images as ProductImage[]) || []

        if (!currentImages.find(img => img.url === imageUrl)) {
            return { success: false, error: '\u0627\u0644\u0635\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629' }
        }

        // Update isPrimary for all images
        const updatedImages = currentImages.map(img => ({
            ...img,
            isPrimary: img.url === imageUrl
        }))

        await prisma.product.update({
            where: { id: productId },
            data: { images: updatedImages as any }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return { success: true }
    } catch (error) {
        console.error('Failed to set primary image:', error)
        return { success: false, error: '\u0641\u0634\u0644 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629' }
    }
}

/**
 * Reorder product images
 */
export async function reorderProductImages(
    productId: string,
    images: ProductImage[]
) {
    try {
        // Validate
        const validation = validateProductImages(images)
        if (!validation.valid) {
            return { success: false, error: validation.error }
        }

        await prisma.product.update({
            where: { id: productId },
            data: { images: images as any }
        })

        revalidatePath('/inventory')
        revalidatePath(`/inventory/${productId}`)

        return { success: true }
    } catch (error) {
        console.error('Failed to reorder images:', error)
        return { success: false, error: '\u0641\u0634\u0644 \u0625\u0639\u0627\u062f\u0629 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0635\u0648\u0631' }
    }
}
