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
 * e.g. "products/elc-ap-0001"
 */
function getProductSubDir(productCode: string): string {
    return buildSubPath(STORAGE.productFolder, sanitizeSlug(productCode))
}

/**
 * Build the sub-path for a product image file.
 * e.g. "products/elc-ap-0001/01.webp"
 */
function getProductImageSubPath(productCode: string, filename: string): string {
    return buildSubPath(getProductSubDir(productCode), filename)
}

// ─── Core Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a product image with organized folder structure.
 *
 * Files are named by order: 01.webp, 02.webp, etc.
 *
 * @param file          - The image file to upload
 * @param productCode   - Product composite code (folder name, e.g. "ELC-AP-0001")
 * @param order         - 0-based image order (produces filename: 01.webp, 02.webp, ...)
 * @param oldImagePath  - Optional old image path to delete before saving
 */
export async function uploadProductImage(
    file: File,
    productCode: string,
    order: number = 0,
    oldImagePath?: string | null
): Promise<{ success: boolean; url?: string; filename?: string; sizeBytes?: number; width?: number; height?: number; error?: string }> {
    try {
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

        if (!productCode?.trim()) {
            return { success: false, error: 'رمز المنتج مطلوب — يُرجى إدخال رمز المنتج لتحديد مجلد الحفظ' }
        }

        // ── Prepare paths ────────────────────────────────────────────────────
        const dirSubPath = getProductSubDir(productCode)
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
        const subPath = getProductImageSubPath(productCode, filename)

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

/**
 * Upload multiple product images at once.
 * Files are auto-named by order: 01.webp, 02.webp, ...
 */
export type UploadResult = Awaited<ReturnType<typeof uploadProductImage>>

export async function uploadProductImages(
    files: File[],
    productCode: string,
    startIndex: number = 0
): Promise<{ success: boolean; results: UploadResult[]; errors?: string[] }> {
    const results = await Promise.all(
        files.map((file, i) => {
            const order = startIndex + i
            return uploadProductImage(file, productCode, order)
        })
    )

    const errors: string[] = []
    results.forEach((r, i) => {
        if (!r.success) errors.push(`الصورة ${i + 1}: ${r.error}`)
    })

    return {
        success: errors.length === 0,
        results,
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
    productCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!productCode?.trim()) return { success: true }

        const folderPath = toDiskDir(getProductSubDir(productCode))
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
 * Move product images folder when productCode changes.
 * Called automatically when updating a product's productCode.
 */
export async function moveProductImages(
    oldProductCode: string,
    newProductCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!oldProductCode || !newProductCode) return { success: true }
        if (sanitizeSlug(oldProductCode) === sanitizeSlug(newProductCode)) return { success: true }

        const oldDir = toDiskDir(getProductSubDir(oldProductCode))
        const newDir = toDiskDir(getProductSubDir(newProductCode))

        if (!existsSync(oldDir)) return { success: true }

        // Ensure parent exists
        const parentDir = toDiskDir('products')
        await mkdir(parentDir, { recursive: true })

        // Read all files and move them
        const { rename } = await import('fs/promises')
        await rename(oldDir, newDir)

        console.log(`✓ Product images moved: ${oldProductCode} → ${newProductCode}`)
        return { success: true }
    } catch (error) {
        console.error('Move images error:', error)
        return { success: false, error: 'تعذّر نقل مجلد الصور — يُرجى المحاولة مجدداً' }
    }
}
