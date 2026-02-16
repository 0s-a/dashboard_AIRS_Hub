'use server'

import { writeFile, unlink, readdir } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'

/**
 * Delete old image file if it exists
 * @param imagePath - Relative path to the image (e.g., '/uploads/products/PRD-123/main.webp')
 */
export async function deleteOldImage(imagePath: string) {
    try {
        if (!imagePath) return { success: true }

        // Security: Ensure path starts with /uploads to prevent arbitrary file deletion
        if (!imagePath.startsWith('/uploads/')) {
            console.warn('محاولة حذف ملف خارج مجلد uploads:', imagePath)
            return { success: false, error: 'مسار الملف غير صالح' }
        }

        const fullPath = join(process.cwd(), 'public', imagePath)
        if (existsSync(fullPath)) {
            await unlink(fullPath)
            console.log('✓ تم حذف الصورة القديمة:', imagePath)
        }
        return { success: true }
    } catch (error) {
        console.error('خطأ في حذف الصورة:', error)
        return {
            success: false,
            error: 'فشل حذف الصورة القديمة'
        }
    }
}

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
] as const

/**
 * Sanitize filename to prevent path traversal and special characters
 */
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
        .replace(/^\./, '') // Remove leading dot
        .toLowerCase()
}

/**
 * Validate file type based on MIME type
 */
function isValidImageType(file: File): boolean {
    return ALLOWED_IMAGE_TYPES.includes(file.type as any)
}

/**
 * Upload image with organized structure based on itemNumber
 * @param file - The file to upload
 * @param entityType - Type of entity: 'products', 'categories', etc.
 * @param itemNumber - Item number for organization (e.g., 'PRD-123', 'CLR-PRD123-001')
 * @param subFolder - Optional subfolder (e.g., 'colors', 'variants')
 * @param fieldName - Field name for the image (e.g., 'main', color itemNumber)
 * @param oldImagePath - Optional path to old image to delete
 */
export async function uploadImageWithItemNumber(
    file: File,
    entityType: 'products' | 'categories',
    itemNumber: string,
    subFolder?: string,
    fieldName?: string,
    oldImagePath?: string | null
) {
    try {
        // Validation: Check if file exists
        if (!file) {
            return { success: false, error: 'لم يتم رفع أي ملف' }
        }

        // Validation: Check MIME type
        if (!isValidImageType(file)) {
            return {
                success: false,
                error: 'نوع الملف غير مدعوم. يُرجى رفع صورة بصيغة JPG، PNG، WEBP أو GIF'
            }
        }

        // Security: Sanitize itemNumber to prevent path traversal
        const sanitizedItemNumber = sanitizeFilename(itemNumber)
        if (!sanitizedItemNumber) {
            return { success: false, error: 'رقم الصنف غير صالح' }
        }

        // Security: Sanitize subFolder if provided
        const sanitizedSubFolder = subFolder ? sanitizeFilename(subFolder) : undefined

        // Security: Sanitize fieldName if provided
        const sanitizedFieldName = fieldName ? sanitizeFilename(fieldName) : undefined

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Build directory path
        const parts = ['public', 'uploads', entityType, sanitizedItemNumber]
        if (sanitizedSubFolder) {
            parts.push(sanitizedSubFolder)
        }
        const uploadDir = join(process.cwd(), ...parts)

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true })

        // Get file extension and sanitize
        const originalExt = file.name.split('.').pop() || 'jpg'
        const ext = sanitizeFilename(originalExt)

        // Create filename
        const filename = sanitizedFieldName ? `${sanitizedFieldName}.${ext}` : `image.${ext}`
        const filePath = join(uploadDir, filename)

        // Delete old image if exists
        if (oldImagePath) {
            await deleteOldImage(oldImagePath)
        } else if (existsSync(filePath)) {
            // Delete existing file with same name
            await unlink(filePath)
        }

        // Write new file
        await writeFile(filePath, buffer)
        console.log('✓ تم رفع الصورة بنجاح:', filename)

        // Build URL path
        const urlParts = ['/uploads', entityType, sanitizedItemNumber]
        if (sanitizedSubFolder) {
            urlParts.push(sanitizedSubFolder)
        }
        urlParts.push(filename)
        const url = urlParts.join('/')

        return { success: true, url }
    } catch (error) {
        console.error('خطأ في رفع الصورة:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'فشل رفع الصورة. الرجاء المحاولة مرة أخرى'
        }
    }
}

/**
 * Legacy upload function - maintains backward compatibility
 * Stores images with timestamp in flat structure
 */
export async function uploadImage(formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) {
            return { success: false, error: 'No file uploaded' }
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'public/uploads')
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore if exists
        }

        // Unique filename
        const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
        const path = join(uploadDir, filename)

        await writeFile(path, buffer)

        return { success: true, url: `/uploads/${filename}` }
    } catch (error) {
        console.error('Upload error:', error)
        return { success: false, error: 'Upload failed' }
    }
}
