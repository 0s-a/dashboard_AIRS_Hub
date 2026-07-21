/**
 * ─── Image Storage Configuration ───────────────────────────
 * Central config for all image storage, processing, validation,
 * naming, and display dimensions.
 *
 * Controls:
 *   - Upload limits (size, count, allowed types)
 *   - Image processing (format, quality, dimensions)
 *   - Storage paths (URL prefix, disk root, folder structure)
 *   - Naming convention (UUID-based filenames)
 *   - Display dimensions (thumbnails, cards, gallery, full-size)
 *   - Slug sanitization rules
 *
 * Usage:
 *   import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'
 *   const { upload, processing, storage, naming, display } = IMAGE_STORAGE_CONFIG
 */

import { join } from 'path'

export const IMAGE_STORAGE_CONFIG = {

    // ── Upload Limits ────────────────────────────────────────

    upload: {
        /** Maximum file size in bytes (20 MB) */
        maxFileSize: 20 * 1024 * 1024,

        /** Maximum images per product */
        maxImagesPerProduct: 5,

        /** Accepted MIME types for image upload */
        allowedTypes: [
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
        ] as readonly string[],

        /** Human-readable list of accepted formats (for error messages) */
        get allowedFormatsLabel(): string {
            return 'JPG، PNG، WEBP، AVIF أو HEIC'
        },

        /** Human-readable max size (for error messages) */
        get maxFileSizeLabel(): string {
            return `${this.maxFileSize / (1024 * 1024)}MB`
        },
    },

    // ── Image Processing (Sharp / WebP) ──────────────────────

    processing: {
        /** Output format */
        format: 'webp' as const,

        /** WebP quality (1–100). Higher = better quality, larger file */
        quality: 82,

        /** Sharp effort level (0–6). Higher = slower but smaller file */
        effort: 4,

        /** Maximum width in pixels. Larger images are scaled down */
        maxWidth: 2400,

        /** Maximum height in pixels. Larger images are scaled down */
        maxHeight: 2400,

        /** Enable smart sub-sampling for better compression */
        smartSubsample: true,

        /** Fallback extension when Sharp can't convert the image */
        fallbackExtension: 'jpg',
    },

    // ── Naming Convention ────────────────────────────────────

    naming: {
        /**
         * Build a unique filename from an id and extension.
         * Uses UUID (or any unique id) so deletions never overwrite existing files.
         */
        buildFilename(id: string, ext: string): string {
            return `${id}.${ext}`
        },
    },

    // ── Display Dimensions ───────────────────────────────────
    //    Used by UI components when rendering <Image> or CSS sizing.
    //    All values in pixels.

    display: {
        /** Tiny thumbnail — inventory table rows, search results */
        thumbnail: { width: 48, height: 48 },

        /** Small card — recent products on dashboard */
        card: { width: 80, height: 80 },

        /** Medium preview — product detail sidebar, gallery grid */
        preview: { width: 200, height: 200 },

        /** Large — product detail hero image */
        hero: { width: 600, height: 600 },

        /** Full-size — lightbox / zoom view */
        full: { width: 1200, height: 1200 },

        /** Gallery grid — items per row at each breakpoint */
        galleryGrid: {
            sm: 2,   // mobile
            md: 3,   // tablet
            lg: 4,   // desktop
            xl: 5,   // wide
        },

        /** Aspect ratio for product images (width:height) */
        aspectRatio: '1/1' as const,

        /** Border radius for image containers (CSS value) */
        borderRadius: '0.5rem',

        /** Placeholder background color when no image */
        placeholderBg: 'hsl(var(--muted))',
    },

    // ── Storage Paths ────────────────────────────────────────

    storage: {
        /**
         * URL path prefix for serving images.
         * Resolved from IMAGE_STORAGE_PATH env var.
         * Default: "/uploads"
         */
        get urlPrefix(): string {
            return (process.env.IMAGE_STORAGE_PATH || '/uploads').replace(/\/+$/, '')
        },

        /**
         * Physical disk root where images are stored.
         * Resolved from IMAGE_DISK_ROOT env var.
         * Default: <cwd>/public
         */
        get diskRoot(): string {
            return process.env.IMAGE_DISK_ROOT?.trim() || join(process.cwd(), 'public')
        },

        /** Top-level folder name inside the storage path */
        productFolder: 'products',
    },

    // ── Slug / Filename Rules ────────────────────────────────

    slug: {
        /** Characters allowed in folder/file names (regex) */
        allowedChars: /[^a-z0-9-_]/g,

        /** Replace multiple underscores with single */
        collapseChar: '_',

        /** Strip leading/trailing underscores */
        trimPattern: /^_|_$/g,
    },

} as const
