import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, extname } from 'path'
import { IMAGE_STORAGE_CONFIG } from '@/lib/config/image-storage.config'

/**
 * Dynamic image serving route.
 *
 * When IMAGE_DISK_ROOT points outside /public, Next.js can't serve
 * those files statically. This route reads from the configured disk
 * root and streams the file back with correct Content-Type and
 * aggressive caching headers.
 *
 * URL:  /uploads/products/465-bu-0001/01.webp
 * Disk: {IMAGE_DISK_ROOT}/uploads/products/465-bu-0001/01.webp
 */

const MIME_MAP: Record<string, string> = {
    '.webp': 'image/webp',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.avif': 'image/avif',
    '.bmp':  'image/bmp',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path: segments } = await params

    // Prevent directory traversal attacks
    const subPath = segments.join('/')
    if (subPath.includes('..') || subPath.includes('\0')) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    // Build full disk path:  {diskRoot}/{urlPrefix}/{subPath}
    const diskRoot  = IMAGE_STORAGE_CONFIG.storage.diskRoot
    const urlPrefix = IMAGE_STORAGE_CONFIG.storage.urlPrefix.replace(/^\//, '')
    const filePath  = join(diskRoot, urlPrefix, subPath)

    try {
        // Check file exists
        const fileStat = await stat(filePath)
        if (!fileStat.isFile()) {
            return new NextResponse('Not Found', { status: 404 })
        }

        // Read file
        const buffer = await readFile(filePath)
        const ext = extname(filePath).toLowerCase()
        const contentType = MIME_MAP[ext] || 'application/octet-stream'

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(fileStat.size),
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Last-Modified': fileStat.mtime.toUTCString(),
            },
        })
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return new NextResponse('Not Found', { status: 404 })
        }
        console.error('[uploads] Error serving file:', filePath, err.message)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
