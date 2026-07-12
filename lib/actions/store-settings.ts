"use server"

import { prisma } from "@/lib/prisma"
import { buildSubPath, toDiskDir, toDisplayUrl } from "@/lib/utils/image-paths"
import { requireAuth } from "@/lib/auth-utils"

const DEFAULT_ID = "default"

export async function getStoreSettings() {
    try {
        let settings = await prisma.storeSettings.findUnique({
            where: { id: DEFAULT_ID },
        })

        // Create default row if it doesn't exist
        if (!settings) {
            settings = await prisma.storeSettings.create({
                data: { id: DEFAULT_ID },
            })
        }

        // Convert sub-paths to display URLs for the client
        return {
            success: true,
            data: {
                ...settings,
                logo: settings.logo ? toDisplayUrl(settings.logo) : null,
                favicon: settings.favicon ? toDisplayUrl(settings.favicon) : null,
            },
        }
    } catch (error) {
        console.error("Failed to get store settings:", error)
        return { success: false, error: "فشل جلب إعدادات المتجر" }
    }
}

export async function updateStoreSettings(data: {
    name?: string
    description?: string
    phone?: string
    email?: string
    whatsapp?: string
    website?: string
    address?: string
    city?: string
    country?: string
    workingHours?: any
    socialLinks?: any
}) {
    try {
        await requireAuth()
        const settings = await prisma.storeSettings.upsert({
            where: { id: DEFAULT_ID },
            update: {
                ...data,
                updatedAt: new Date(),
            },
            create: {
                id: DEFAULT_ID,
                ...data,
            },
        })

        return { success: true, data: settings }
    } catch (error) {
        console.error("Failed to update store settings:", error)
        return { success: false, error: "فشل تحديث إعدادات المتجر" }
    }
}

export async function uploadStoreLogo(formData: FormData) {
    try {
        await requireAuth()
        const file = formData.get("file") as File
        if (!file || file.size === 0) {
            return { success: false, error: "لم يتم اختيار ملف" }
        }

        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: "حجم الملف يتجاوز 5MB" }
        }

        const { writeFile, mkdir } = await import("fs/promises")
        const { join } = await import("path")
        const { processImageToWebP } = await import("@/lib/utils/image-processor")

        const uploadDir = toDiskDir("store")
        await mkdir(uploadDir, { recursive: true })

        const rawBuffer = Buffer.from(await file.arrayBuffer())
        const { buffer } = await processImageToWebP(rawBuffer)

        const filename = "logo.webp"
        const filePath = join(uploadDir, filename)
        await writeFile(filePath, buffer)

        // Store sub-path in DB (not full URL)
        const subPath = buildSubPath("store", filename)

        await prisma.storeSettings.upsert({
            where: { id: DEFAULT_ID },
            update: { logo: subPath },
            create: { id: DEFAULT_ID, logo: subPath },
        })

        // Return display URL for immediate UI update
        const displayUrl = `${toDisplayUrl(subPath)}?t=${Date.now()}`
        return { success: true, url: displayUrl }
    } catch (error) {
        console.error("Failed to upload store logo:", error)
        return { success: false, error: "فشل رفع الشعار" }
    }
}

export async function deleteStoreLogo() {
    try {
        const { unlink } = await import("fs/promises")
        const { join } = await import("path")
        const { existsSync } = await import("fs")

        const filePath = join(toDiskDir("store"), "logo.webp")
        if (existsSync(filePath)) {
            await unlink(filePath)
        }

        await prisma.storeSettings.update({
            where: { id: DEFAULT_ID },
            data: { logo: null },
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to delete store logo:", error)
        return { success: false, error: "فشل حذف الشعار" }
    }
}
