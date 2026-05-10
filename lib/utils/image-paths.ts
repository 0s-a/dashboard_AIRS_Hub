/**
 * lib/utils/image-paths.ts
 *
 * Centralized image path utilities.
 *
 * Design:
 *   - DB stores **sub-paths only** (e.g. "products/ELC-AP-0001/main.webp")
 *   - IMAGE_STORAGE_CONFIG controls the base URL prefix and disk root
 *   - This module builds full paths at runtime for display, disk I/O, and external URLs
 */

import { join } from 'path'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'

// ─── Core getters ─────────────────────────────────────────────────────────────

/** URL path prefix for images (from config / env) */
export function getStoragePath(): string {
    return IMAGE_STORAGE_CONFIG.storage.urlPrefix
}

/** Physical disk root (from config / env) */
export function getDiskRoot(): string {
    return IMAGE_STORAGE_CONFIG.storage.diskRoot
}

// ─── Path builders ────────────────────────────────────────────────────────────

/**
 * Build a sub-path from segments.
 * This is the value stored in the database.
 *
 * @example buildSubPath('products', 'ELC-AP-0001', 'main.webp')
 *          → "products/ELC-AP-0001/main.webp"
 */
export function buildSubPath(...segments: string[]): string {
    return segments.filter(Boolean).join('/')
}

/**
 * Build a full URL path for browser display.
 * Prepends the storage path prefix to a DB sub-path.
 *
 * @example toDisplayUrl('products/ELC-AP-0001/main.webp')
 *          → "/uploads/products/ELC-AP-0001/main.webp"
 */
export function toDisplayUrl(subPath: string): string {
    if (!subPath) return ''
    // Already a full URL or already prefixed — return as-is
    if (subPath.startsWith('http://') || subPath.startsWith('https://')) return subPath
    const prefix = getStoragePath()
    if (subPath.startsWith(prefix)) return subPath
    return `${prefix}/${subPath}`
}

/**
 * Build an absolute URL for external consumers (WhatsApp, n8n, bots).
 * Combines NEXT_PUBLIC_BASE_URL + storage path + sub-path.
 *
 * @example toExternalUrl('products/ELC-AP-0001/main.webp')
 *          → "http://localhost:3000/uploads/products/ELC-AP-0001/main.webp"
 */
export function toExternalUrl(subPath: string): string {
    if (!subPath) return ''
    if (subPath.startsWith('http://') || subPath.startsWith('https://')) return subPath
    const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? ''
    return `${base}${toDisplayUrl(subPath)}`
}

/**
 * Build a full filesystem path for reading/writing image files.
 *
 * @example toDiskPath('products/ELC-AP-0001/main.webp')
 *          → "/home/user/project/public/uploads/products/ELC-AP-0001/main.webp"
 */
export function toDiskPath(subPath: string): string {
    return join(getDiskRoot(), getStoragePath(), subPath)
}

/**
 * Build the disk directory path for a sub-path (without the filename).
 *
 * @example toDiskDir('products/ELC-AP-0001')
 *          → "/home/user/project/public/uploads/products/ELC-AP-0001"
 */
export function toDiskDir(subPath: string): string {
    return join(getDiskRoot(), getStoragePath(), subPath)
}

// ─── Legacy migration helpers ─────────────────────────────────────────────────

/**
 * Extract the sub-path from a legacy full URL path.
 * Strips the storage prefix (e.g. "/uploads/") if present.
 *
 * @example extractSubPath('/uploads/products/ELC-AP-0001/main.webp')
 *          → "products/ELC-AP-0001/main.webp"
 */
export function extractSubPath(fullUrl: string): string {
    if (!fullUrl) return ''
    // Strip absolute URL prefix if present
    if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
        try {
            const url = new URL(fullUrl)
            fullUrl = url.pathname
        } catch {
            // Not a valid URL, continue with string processing
        }
    }
    const prefix = getStoragePath()
    if (fullUrl.startsWith(`${prefix}/`)) {
        return fullUrl.slice(prefix.length + 1)
    }
    // Strip leading slash
    if (fullUrl.startsWith('/')) return fullUrl.slice(1)
    return fullUrl
}
