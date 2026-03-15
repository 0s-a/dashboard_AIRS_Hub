'use server'

import { writeFile, unlink, readdir, rm } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { processImageToWebP } from '@/lib/utils/image-processor'
import { prisma } from '@/lib/prisma'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
}

function isValidImageType(file: File): boolean {
    return ALLOWED_IMAGE_TYPES.includes(file.type as any)
}

function getPublicDir(): string {
    return join(process.cwd(), 'public')
}

/**
 * Build the organized folder path for a product
 * Structure: public/uploads/products/{itemNumber}/
 */
function getProductUploadDir(itemNumber: string, subFolder?: string): string {
    const slug = sanitizeSlug(itemNumber)
    const parts = [getPublicDir(), 'uploads', 'products', slug]
    if (subFolder) parts.push(sanitizeSlug(subFolder))
    return join(...parts)
}

/**
 * Build the public URL for a product image
 */
function getProductImageUrl(itemNumber: string, filename: string, subFolder?: string): string {
    const slug = sanitizeSlug(itemNumber)
    const parts = ['/uploads', 'products', slug]
    if (subFolder) parts.push(sanitizeSlug(subFolder))
    parts.push(filename)
    return parts.join('/')
}

// ─── Core Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a product image with organized folder structure.
 *
 * @param file          - The image file to upload
 * @param itemNumber    - Product item number (used as folder name)
 * @param slot          - Image slot name: 'main', 'gallery-1', 'gallery-2', etc.
 * @param subFolder     - Optional sub-folder: 'colors', 'variants'
 * @param oldImagePath  - Optional old image path to delete before saving
 */
export async function uploadProductImage(
    file: File,
    itemNumber: string,
    slot: string = 'main',
    subFolder?: string,
    oldImagePath?: string | null
): Promise<{ success: boolean; url?: string; mediaId?: string; error?: string }> {
    try {
        // ── Validation ──────────────────────────────────────────────────────
        if (!file || file.size === 0) {
            return { success: false, error: 'لم يتم اختيار ملف — يُرجى اختيار صورة للرفع' }
        }

        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(1)
            return {
                success: false,
                error: `حجم الملف (${sizeMB}MB) يتجاوز الحد المسموح (20MB)`,
            }
        }

        if (!isValidImageType(file)) {
            return {
                success: false,
                error: 'صيغة الملف غير مدعومة — يُرجى رفع صورة بصيغة JPG، PNG، WEBP، AVIF أو HEIC',
            }
        }

        if (!itemNumber?.trim()) {
            return { success: false, error: 'رقم الصنف مطلوب — يُرجى إدخال رقم الصنف لتحديد مجلد الحفظ' }
        }

        // ── Prepare paths ────────────────────────────────────────────────────
        const uploadDir = getProductUploadDir(itemNumber, subFolder)
        await mkdir(uploadDir, { recursive: true })

        const safeSlot = sanitizeSlug(slot) || 'img'

        // ── Process + write ──────────────────────────────────────────────────
        const rawBuffer = Buffer.from(await file.arrayBuffer())
        const { buffer, width, height, size, savedPercent } = await processImageToWebP(rawBuffer)

        // If Sharp converted successfully, save as .webp; otherwise keep original extension
        const wasConverted = width > 0
        const ext = wasConverted
            ? 'webp'
            : (file.name.split('.').pop()?.toLowerCase() || 'jpg')
        const filename = `${safeSlot}.${ext}`
        const filePath = join(uploadDir, filename)

        // ── Delete old image ─────────────────────────────────────────────────
        if (oldImagePath) {
            await deleteProductImage(oldImagePath)
        } else if (existsSync(filePath)) {
            await unlink(filePath)
        }

        await writeFile(filePath, buffer)

        const url = getProductImageUrl(itemNumber, filename, subFolder)

        // CREATE MediaImage record
        const mediaImage = await prisma.mediaImage.create({
            data: {
                url,
                filename,
                sizeBytes: size,
                width: width || null,
                height: height || null,
                // Notice: productId is not filled yet because we might not have a target Product ID 
                // when uploading images for a new product just being created.
            }
        })

        console.log(
            wasConverted
                ? `✓ Image uploaded & logged: ${url} | ${width}×${height} | ${(size / 1024).toFixed(0)}KB | saved ${savedPercent}%`
                : `⚠ Image saved as-is & logged: ${url} | ${(size / 1024).toFixed(0)}KB (format not convertible)`
        )

        return { success: true, url, mediaId: mediaImage.id }
    } catch (error) {
        console.error('Image upload error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'تعذّر رفع الصورة — يُرجى المحاولة مجدداً',
        }
    }
}

/**
 * Upload multiple product images at once.
 * Slots are auto-named: main, gallery-1, gallery-2, ...
 */
export async function uploadProductImages(
    files: File[],
    itemNumber: string,
    startIndex: number = 0
): Promise<{ success: boolean; urls?: string[]; mediaIds?: string[]; errors?: string[] }> {
    const results = await Promise.all(
        files.map((file, i) => {
            const slot = startIndex === 0 && i === 0 ? 'main' : `gallery-${startIndex + i}`
            return uploadProductImage(file, itemNumber, slot)
        })
    )

    const urls: string[] = []
    const mediaIds: string[] = []
    const errors: string[] = []

    results.forEach((r, i) => {
        if (r.success && r.url) {
            urls.push(r.url)
            if (r.mediaId) mediaIds.push(r.mediaId)
        } else {
            errors.push(`الصورة ${i + 1}: ${r.error}`)
        }
    })

    return {
        success: errors.length === 0,
        urls,
        mediaIds,
        errors: errors.length > 0 ? errors : undefined,
    }
}

/**
 * Upload an image to the standalone gallery (not tied to a product).
 * Saves to public/uploads/gallery/{uuid}.webp
 * Returns url, filename, width, height, sizeBytes for MediaImage record.
 */
export async function uploadGalleryImage(
    file: File
): Promise<{ success: boolean; url?: string; filename?: string; width?: number; height?: number; sizeBytes?: number; error?: string }> {
    try {
        if (!file || file.size === 0) return { success: false, error: 'لم يتم اختيار ملف' }
        if (file.size > MAX_FILE_SIZE) return { success: false, error: `حجم الملف يتجاوز 20MB` }
        if (!isValidImageType(file)) return { success: false, error: 'صيغة الملف غير مدعومة' }

        const uploadDir = join(getPublicDir(), 'uploads', 'gallery')
        await mkdir(uploadDir, { recursive: true })

        const rawBuffer = Buffer.from(await file.arrayBuffer())
        const { buffer, width, height, size } = await processImageToWebP(rawBuffer)

        const { v4: uuidv4 } = await import('crypto').then(m => ({ v4: () => m.randomUUID() }))
        const filename = `${uuidv4()}.webp`
        const filePath = join(uploadDir, filename)
        await writeFile(filePath, buffer)

        const url = `/uploads/gallery/${filename}`
        console.log(`✓ Gallery image uploaded: ${url} | ${width}×${height} | ${(size / 1024).toFixed(0)}KB`)

        return { success: true, url, filename, width, height, sizeBytes: size }
    } catch (error) {
        console.error('Gallery upload error:', error)
        return { success: false, error: 'تعذّر رفع الصورة' }
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a single product image file.
 */
export async function deleteProductImage(
    imagePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!imagePath) return { success: true }

        if (!imagePath.startsWith('/uploads/')) {
            console.warn('Attempted to delete file outside uploads:', imagePath)
            return { success: false, error: 'مسار الملف غير صالح — تعذّر تحديد موقع الصورة' }
        }

        const fullPath = join(getPublicDir(), imagePath)
        if (existsSync(fullPath)) {
            await unlink(fullPath)
            console.log(`✓ Image deleted: ${imagePath}`)
        }

        return { success: true }
    } catch (error) {
        console.error('Image delete error:', error)
        return { success: false, error: 'تعذّر حذف الصورة — يُرجى المحاولة مجدداً' }
    }
}

/**
 * Delete the entire product image folder.
 * Used when deleting a product.
 */
export async function deleteProductFolder(
    itemNumber: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!itemNumber?.trim()) return { success: true }

        const folderPath = getProductUploadDir(itemNumber)
        if (existsSync(folderPath)) {
            await rm(folderPath, { recursive: true, force: true })
            console.log(`✓ Product folder deleted: ${folderPath}`)
        }

        return { success: true }
    } catch (error) {
        console.error('Folder delete error:', error)
        return { success: false, error: 'تعذّر حذف مجلد الصور — يُرجى المحاولة مجدداً' }
    }
}

// ─── Move / Rename ────────────────────────────────────────────────────────────

/**
 * Move product images folder when itemNumber changes.
 * Called automatically when updating a product's itemNumber.
 */
export async function moveProductImages(
    oldItemNumber: string,
    newItemNumber: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!oldItemNumber || !newItemNumber) return { success: true }
        if (sanitizeSlug(oldItemNumber) === sanitizeSlug(newItemNumber)) return { success: true }

        const oldDir = getProductUploadDir(oldItemNumber)
        const newDir = getProductUploadDir(newItemNumber)

        if (!existsSync(oldDir)) return { success: true }

        // Ensure parent exists
        await mkdir(join(getPublicDir(), 'uploads', 'products'), { recursive: true })

        // Read all files and move them
        const { rename } = await import('fs/promises')
        await rename(oldDir, newDir)

        console.log(`✓ Product images moved: ${oldItemNumber} → ${newItemNumber}`)
        return { success: true }
    } catch (error) {
        console.error('Move images error:', error)
        return { success: false, error: 'تعذّر نقل مجلد الصور — يُرجى المحاولة مجدداً' }
    }
}

