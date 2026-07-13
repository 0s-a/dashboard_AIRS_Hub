'use server'

import { writeFile, unlink, rm } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { processImageToWebP } from '@/lib/utils/image-processor'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'
import {
    buildSubPath,
    toDiskPath,
    toDiskDir,
    toDisplayUrl,
} from '@/lib/utils/image-paths'
import { requireAuth } from '@/lib/auth-utils'

// ─── Config aliases ───────────────────────────────────────────────────────────

const { upload: UPLOAD, storage: STORAGE, slug: SLUG, naming: NAMING } = IMAGE_STORAGE_CONFIG

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(SLUG.allowedChars, SLUG.collapseChar)
        .replace(new RegExp(`${SLUG.collapseChar}+`, 'g'), SLUG.collapseChar)
        .replace(SLUG.trimPattern, '')
}

function isValidImageType(file: File): boolean {
    return UPLOAD.allowedTypes.includes(file.type)
}

/**
 * Build the sub-path for a product image folder.
 * e.g. "products/s-el-001"
 */
function getProductSubDir(folderKey: string): string {
    return buildSubPath(STORAGE.productFolder, sanitizeSlug(folderKey))
}

/**
 * Build the sub-path for a product image file.
 * e.g. "products/x-ge-001/01.webp"
 */
function getProductImageSubPath(folderKey: string, filename: string): string {
    return buildSubPath(getProductSubDir(folderKey), filename)
}

// ─── Core Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a product image with organized folder structure.
 *
 * Files are named by order: 01.webp, 02.webp, etc.
 *
 * @param file      - The image file to upload
 * @param folderKey - Folder key for storage (e.g. itemNumber or product id)
 * @param order     - 0-based image order (produces filename: 01.webp, 02.webp, ...)
 * @param oldImagePath - Optional old image path to delete before saving
 */
export async function uploadProductImage(
    file: File,
    folderKey: string,
    order: number = 0,
    oldImagePath?: string | null
): Promise<{ success: boolean; url?: string; filename?: string; sizeBytes?: number; width?: number; height?: number; error?: string }> {
    try {
        await requireAuth()
        // ── Validation ──────────────────────────────────────────────────────
        if (!file || file.size === 0) {
            return { success: false, error: 'لم يتم اختيار ملف — يُرجى اختيار صورة للرفع' }
        }

        if (file.size > UPLOAD.maxFileSize) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(1)
            return {
                success: false,
                error: `حجم الملف (${sizeMB}MB) يتجاوز الحد المسموح (${UPLOAD.maxFileSizeLabel})`,
            }
        }

        if (!isValidImageType(file)) {
            return {
                success: false,
                error: `صيغة الملف غير مدعومة — يُرجى رفع صورة بصيغة ${UPLOAD.allowedFormatsLabel}`,
            }
        }

        if (!folderKey?.trim()) {
            return { success: false, error: 'رمز المنتج مطلوب — يُرجى إدخال رمز المنتج لتحديد مجلد الحفظ' }
        }

        // ── Prepare paths ────────────────────────────────────────────────────
        const dirSubPath = getProductSubDir(folderKey)
        const uploadDir = toDiskDir(dirSubPath)
        await mkdir(uploadDir, { recursive: true })

        // ── Process + write ──────────────────────────────────────────────────
        const rawBuffer = Buffer.from(await file.arrayBuffer())
        const { buffer, width, height, size, savedPercent } = await processImageToWebP(rawBuffer)

        // If Sharp converted successfully, save as .webp; otherwise keep original extension
        const wasConverted = width > 0
        const ext = wasConverted
            ? IMAGE_STORAGE_CONFIG.processing.format
            : (file.name.split('.').pop()?.toLowerCase() || IMAGE_STORAGE_CONFIG.processing.fallbackExtension)
        const filename = NAMING.buildFilename(order, ext)
        const filePath = join(uploadDir, filename)

        // ── Delete old image ─────────────────────────────────────────────────
        if (oldImagePath) {
            await deleteProductImage(oldImagePath)
        } else if (existsSync(filePath)) {
            await unlink(filePath)
        }

        await writeFile(filePath, buffer)

        // Sub-path for DB storage (no prefix)
        const subPath = getProductImageSubPath(folderKey, filename)

        const displayUrl = toDisplayUrl(subPath)
        console.log(
            wasConverted
                ? `✓ Image uploaded: ${displayUrl} | ${width}×${height} | ${(size / 1024).toFixed(0)}KB | saved ${savedPercent}%`
                : `⚠ Image saved as-is: ${displayUrl} | ${(size / 1024).toFixed(0)}KB (format not convertible)`
        )

        return {
            success: true,
            url: subPath,
            filename,
            sizeBytes: size,
            width: width || undefined,
            height: height || undefined,
        }
    } catch (error) {
        console.error('Image upload error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'تعذّر رفع الصورة — يُرجى المحاولة مجدداً',
        }
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
        await requireAuth()
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
    folderKey: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAuth()
        if (!folderKey?.trim()) return { success: true }

        const folderPath = toDiskDir(getProductSubDir(folderKey))
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
