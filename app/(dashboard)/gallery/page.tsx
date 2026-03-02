import { getGalleryImages, getGalleryStats } from "@/lib/actions/gallery"
import { GalleryClient } from "./gallery-client"

export const metadata = {
    title: "معرض الصور | HUSAM-AI",
    description: "معرض الصور المركزي — رفع وإدارة وربط الصور بالمنتجات",
}

export default async function GalleryPage() {
    const [imagesRes, statsRes] = await Promise.all([
        getGalleryImages('all'),
        getGalleryStats(),
    ])

    return (
        <GalleryClient
            initialImages={imagesRes.data ?? []}
            stats={statsRes.data ?? { total: 0, linked: 0, unlinked: 0 }}
        />
    )
}
