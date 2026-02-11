'use server'

import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'

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
