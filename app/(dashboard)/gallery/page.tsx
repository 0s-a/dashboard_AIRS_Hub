export const dynamic = "force-dynamic"

import { getGalleryImages, getGalleryStats } from "@/lib/actions/gallery"
import { GalleryClient } from "./gallery-client"

export const metadata = {
    title: "معرض الصور | نواة",
    description: "عرض صور جميع الأصناف في معرض مرئي احترافي",
}

export default async function GalleryPage() {
    const [galleryRes, statsRes] = await Promise.all([
        getGalleryImages(),
        getGalleryStats(),
    ])

    return (
        <GalleryClient
            initialImages={galleryRes.data ?? []}
            initialCursor={galleryRes.nextCursor ?? null}
            stats={statsRes.data ?? { totalImages: 0, totalItems: 0, totalProducts: 0 }}
        />
    )
}
