/**
 * lib/utils/image-paths.ts
 *
 * Centralized image path utilities.
 *
 * Design:
 *   - DB stores **sub-paths only** (e.g. "products/001-bf-607/main.webp")
 *   - .env stores the base URL prefix (IMAGE_STORAGE_PATH) and optional disk root (IMAGE_DISK_ROOT)
 *   - This module builds full paths at runtime for display, disk I/O, and external URLs
 */

import { join } from 'path'

// ─── Core getters ─────────────────────────────────────────────────────────────

/** URL path prefix for images — from .env, default "/uploads" */
export function getStoragePath(): string {
    return (process.env.IMAGE_STORAGE_PATH || '/uploads').replace(/\/+$/, '')
}

/** Physical disk root — defaults to <cwd>/public */
export function getDiskRoot(): string {
    return process.env.IMAGE_DISK_ROOT?.trim() || join(process.cwd(), 'public')
}

// ─── Path builders ────────────────────────────────────────────────────────────

/**
 * Build a sub-path from segments.
 * This is the value stored in the database.
 *
 * @example buildSubPath('products', '001-bf-607', 'main.webp')
 *          → "products/001-bf-607/main.webp"
 */
export function buildSubPath(...segments: string[]): string {
    return segments.filter(Boolean).join('/')
}

/**
 * Build a full URL path for browser display.
 * Prepends the storage path prefix to a DB sub-path.
 *
 * @example toDisplayUrl('products/001-bf-607/main.webp')
 *          → "/uploads/products/001-bf-607/main.webp"
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
 * @example toExternalUrl('products/001-bf-607/main.webp')
 *          → "http://localhost:3000/uploads/products/001-bf-607/main.webp"
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
 * @example toDiskPath('products/001-bf-607/main.webp')
 *          → "/home/user/project/public/uploads/products/001-bf-607/main.webp"
 */
export function toDiskPath(subPath: string): string {
    return join(getDiskRoot(), getStoragePath(), subPath)
}

/**
 * Build the disk directory path for a sub-path (without the filename).
 *
 * @example toDiskDir('products/001-bf-607')
 *          → "/home/user/project/public/uploads/products/001-bf-607"
 */
export function toDiskDir(subPath: string): string {
    return join(getDiskRoot(), getStoragePath(), subPath)
}

// ─── Legacy migration helpers ─────────────────────────────────────────────────

/**
 * Extract the sub-path from a legacy full URL path.
 * Strips the storage prefix (e.g. "/uploads/") if present.
 *
 * @example extractSubPath('/uploads/products/001-bf-607/main.webp')
 *          → "products/001-bf-607/main.webp"
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
