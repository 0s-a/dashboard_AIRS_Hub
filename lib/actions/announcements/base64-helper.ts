import fs from 'fs'
import { toDiskPath, extractSubPath } from '@/lib/utils/image-paths'

const globalBase64Cache = new Map<string, string>()

/**
 * Converts an array of image URLs to Base64 strings.
 * Used before sending to RabbitMQ so n8n can send media directly.
 * Uses a memory cache to avoid reading the same file 10,000 times from disk.
 * 
 * NOTE: This file must NEVER be imported by a Client Component because it uses `fs`.
 */
export function convertUrlsToBase64(urls: string[]): string[] {
    if (!urls || urls.length === 0) return urls
    
    return urls.map(url => {
        if (!url) return url
        if (globalBase64Cache.has(url)) return globalBase64Cache.get(url)!

        // Extract sub-path (handles both legacy "/uploads/..." and new sub-paths)
        const subPath = extractSubPath(url)
        if (subPath) {
            try {
                const filePath = toDiskPath(subPath)
                if (fs.existsSync(filePath)) {
                    const ext = subPath.split('.').pop()?.toLowerCase() || 'jpeg'
                    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
                    const b64 = fs.readFileSync(filePath, 'base64')
                    const b64Url = `data:${mimeType};base64,${b64}`
                    globalBase64Cache.set(url, b64Url)
                    return b64Url
                }
            } catch (e) {
                console.error("Base64 conversion failed for", subPath, e)
            }
        }
        // Cache the original url if it failed or isn't a local upload
        globalBase64Cache.set(url, url)
        return url
    })
}
