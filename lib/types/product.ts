/**
 * Product Image Type
 */
export type ProductImage = {
    url: string
    alt?: string
    isPrimary: boolean
    order?: number
}

/**
 * Helper to get primary image from images array
 */
export function getPrimaryImage(images: ProductImage[] | null): ProductImage | null {
    if (!images || images.length === 0) return null
    return images.find(img => img.isPrimary) || images[0]
}

/**
 * Helper to get primary image URL
 */
export function getPrimaryImageUrl(images: ProductImage[] | null): string | null {
    const primaryImage = getPrimaryImage(images)
    return primaryImage?.url || null
}

/**
 * Validate images array
 */
export function validateProductImages(images: ProductImage[]): { valid: boolean; error?: string } {
    if (images.length === 0) {
        return { valid: false, error: 'يجب إضافة صورة واحدة على الأقل' }
    }

    if (images.length > 10) {
        return { valid: false, error: 'الحد الأقصى 10 صور' }
    }

    const primaryImages = images.filter(img => img.isPrimary)
    if (primaryImages.length === 0) {
        return { valid: false, error: 'يجب تحديد صورة رئيسية واحدة' }
    }

    if (primaryImages.length > 1) {
        return { valid: false, error: 'لا يمكن تحديد أكثر من صورة رئيسية واحدة' }
    }

    return { valid: true }
}
