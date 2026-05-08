'use server'

import { writeFile, unlink, rm } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { processImageToWebP } from '@/lib/utils/image-processor'
import { prisma } from '@/lib/prisma'
import {
    buildSubPath,
    toDiskPath,
    toDiskDir,
    toDisplayUrl,
} from '@/lib/utils/image-paths'

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

/**
 * Build the sub-path for a product image folder.
 * e.g. "products/001-bf-607" or "products/001-bf-607/colors"
 */
function getProductSubDir(itemNumber: string, subFolder?: string): string {
    const slug = sanitizeSlug(itemNumber)
    return subFolder
        ? buildSubPath('products', slug, sanitizeSlug(subFolder))
        : buildSubPath('products', slug)
}

/**
 * Build the sub-path for a product image file.
 * e.g. "products/001-bf-607/main.webp"
 */
function getProductImageSubPath(itemNumber: string, filename: string, subFolder?: string): string {
    const dir = getProductSubDir(itemNumber, subFolder)
    return buildSubPath(dir, filename)
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
        const dirSubPath = getProductSubDir(itemNumber, subFolder)
        const uploadDir = toDiskDir(dirSubPath)
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

        // Sub-path for DB storage (no prefix)
        const subPath = getProductImageSubPath(itemNumber, filename, subFolder)

        // CREATE MediaImage record
        const mediaImage = await prisma.mediaImage.create({
            data: {
                url: subPath,
                filename,
                sizeBytes: size,
                width: width || null,
                height: height || null,
                // Notice: productId is not filled yet because we might not have a target Product ID 
                // when uploading images for a new product just being created.
            }
        })

        const displayUrl = toDisplayUrl(subPath)
        console.log(
            wasConverted
                ? `✓ Image uploaded & logged: ${displayUrl} | ${width}×${height} | ${(size / 1024).toFixed(0)}KB | saved ${savedPercent}%`
                : `⚠ Image saved as-is & logged: ${displayUrl} | ${(size / 1024).toFixed(0)}KB (format not convertible)`
        )

        return { success: true, url: subPath, mediaId: mediaImage.id }
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

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a single product image file.
 * Accepts either a sub-path or a legacy full URL path.
 */
export async function deleteProductImage(
    imagePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!imagePath) return { success: true }

        // Resolve to disk path — handles both sub-paths and legacy full paths
        const fullPath = toDiskPath(
            imagePath.startsWith('/uploads/')
                ? imagePath.replace(/^\/uploads\//, '')
                : imagePath
        )

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

        const folderPath = toDiskDir(getProductSubDir(itemNumber))
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

        const oldDir = toDiskDir(getProductSubDir(oldItemNumber))
        const newDir = toDiskDir(getProductSubDir(newItemNumber))

        if (!existsSync(oldDir)) return { success: true }

        // Ensure parent exists
        const parentDir = toDiskDir('products')
        await mkdir(parentDir, { recursive: true })

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
