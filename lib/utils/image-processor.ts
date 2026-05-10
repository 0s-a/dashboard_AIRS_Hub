/**
 * Image processing utilities using Sharp.
 * Converts any image format to WebP with optional resize + compression.
 * Sharp is bundled with Next.js (no extra install needed).
 *
 * All defaults are driven by IMAGE_STORAGE_CONFIG.processing
 */

import sharp from 'sharp'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessOptions {
    /** Maximum width in pixels. Larger images are scaled down */
    maxWidth?: number
    /** Maximum height in pixels. Larger images are scaled down */
    maxHeight?: number
    /** WebP quality (1–100) */
    quality?: number
    /** Sharp effort level (0–6, higher = slower but smaller) */
    effort?: number
}

export interface ProcessResult {
    buffer: Buffer
    width: number
    height: number
    /** Size in bytes after processing */
    size: number
    /** Size reduction percentage vs original */
    savedPercent: number
}

// ─── Config-driven defaults ───────────────────────────────────────────────────

const PROC = IMAGE_STORAGE_CONFIG.processing

const DEFAULTS: Required<ProcessOptions> = {
    maxWidth:  PROC.maxWidth,
    maxHeight: PROC.maxHeight,
    quality:   PROC.quality,
    effort:    PROC.effort,
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Convert any image buffer to WebP format with resize + compression.
 *
 * - Preserves aspect ratio (never upscales small images)
 * - Auto-rotates based on EXIF orientation
 * - Works with: JPG, PNG, WEBP, GIF, AVIF, HEIC, HEIF, BMP, TIFF
 */
export async function processImageToWebP(
    input: Buffer,
    options?: ProcessOptions
): Promise<ProcessResult> {
    const { maxWidth, maxHeight, quality, effort } = { ...DEFAULTS, ...options }
    const originalSize = input.length

    try {
        const processed = await sharp(input)
            .rotate()                                    // fix EXIF orientation
            .resize(maxWidth, maxHeight, {
                fit: 'inside',                           // maintain aspect ratio
                withoutEnlargement: true,                // never upscale small images
            })
            .webp({ quality, effort, smartSubsample: true })
            .toBuffer({ resolveWithObject: true })

        const { data, info } = processed
        const savedPercent = Math.round((1 - data.length / originalSize) * 100)

        return {
            buffer: data,
            width: info.width,
            height: info.height,
            size: data.length,
            savedPercent: Math.max(0, savedPercent),
        }
    } catch (error) {
        // Fallback: if Sharp can't process the format (e.g. HEIC without libheif),
        // return the original buffer unchanged
        console.warn(
            `⚠ Sharp could not process image (${(originalSize / 1024).toFixed(0)}KB), saving as-is:`,
            error instanceof Error ? error.message : error
        )
        return {
            buffer: input,
            width: 0,
            height: 0,
            size: originalSize,
            savedPercent: 0,
        }
    }
}
