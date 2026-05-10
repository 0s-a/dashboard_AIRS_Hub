"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
    Images,
    X,
    ChevronLeft,
    ChevronRight,
    Download,
    ZoomIn,
    Package,
    ExternalLink,
    Star,
    Loader2,
    ChevronDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getGalleryImages } from "@/lib/actions/gallery"
import type { GalleryImage, GalleryStats } from "@/lib/actions/gallery"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GalleryClientProps {
    initialImages: GalleryImage[]
    initialCursor: string | null
    stats: GalleryStats
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
    images,
    index,
    onClose,
    onNext,
    onPrev,
}: {
    images: GalleryImage[]
    index: number
    onClose: () => void
    onNext: () => void
    onPrev: () => void
}) {
    const img = images[index]
    if (!img) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close */}
            <button
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all z-10"
                onClick={onClose}
            >
                <X className="h-6 w-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
                {index + 1} / {images.length}
            </div>

            {/* Product info top-left */}
            <div className="absolute top-4 left-4 z-10">
                <Link
                    href={`/inventory/${img.productId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 bg-primary/90 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-xl hover:bg-primary transition-colors shadow-lg"
                >
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{img.productName}</span>
                    <span className="text-white/70 font-mono text-xs">#{img.itemNumber}</span>
                </Link>
            </div>

            {/* Prev */}
            {images.length > 1 && (
                <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all"
                    onClick={(e) => { e.stopPropagation(); onPrev() }}
                >
                    <ChevronRight className="h-8 w-8" />
                </button>
            )}

            {/* Image */}
            <div
                className="relative max-w-5xl max-h-[85vh] w-full h-full mx-20"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={img.url}
                    alt={img.alt || img.productName}
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {/* Next */}
            {images.length > 1 && (
                <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all"
                    onClick={(e) => { e.stopPropagation(); onNext() }}
                >
                    <ChevronLeft className="h-8 w-8" />
                </button>
            )}

            {/* Bottom info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/60 text-xs bg-black/40 backdrop-blur-sm px-5 py-2.5 rounded-xl">
                {img.isPrimary && (
                    <span className="flex items-center gap-1 text-amber-400">
                        <Star className="h-3 w-3 fill-current" />
                        رئيسية
                    </span>
                )}
                <span>{img.filename}</span>
                {img.width && img.height && <span>{img.width}×{img.height}</span>}
                <a
                    href={img.url}
                    download={img.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                >
                    <Download className="h-3.5 w-3.5" />
                    تحميل
                </a>
            </div>
        </div>
    )
}

// ─── Image Card ───────────────────────────────────────────────────────────────

function ImageCard({
    image,
    onLightbox,
}: {
    image: GalleryImage
    onLightbox: () => void
}) {
    return (
        <div className="group relative rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 bg-card hover:-translate-y-0.5">
            {/* Image */}
            <div
                className="aspect-square relative cursor-zoom-in overflow-hidden"
                onClick={onLightbox}
            >
                <Image
                    src={image.url}
                    alt={image.alt || image.productName}
                    fill
                    className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                </div>

                {/* Primary badge */}
                {image.isPrimary && (
                    <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            رئيسية
                        </div>
                    </div>
                )}

                {/* Category badge */}
                {image.categoryName && (
                    <div className="absolute top-2 left-2">
                        <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm border-0 shadow-sm"
                        >
                            {image.categoryName}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Footer — Product Info */}
            <Link
                href={`/inventory/${image.productId}`}
                className="block p-3 group/link hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-foreground group-hover/link:text-primary transition-colors">
                            {image.productName}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            #{image.productCode}
                        </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover/link:text-primary transition-colors shrink-0 mt-0.5" />
                </div>
            </Link>
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function GalleryClient({ initialImages, initialCursor, stats }: GalleryClientProps) {
    const [images, setImages] = useState<GalleryImage[]>(initialImages)
    const [cursor, setCursor] = useState<string | null>(initialCursor)
    const [loading, setLoading] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

    const loadMore = useCallback(async () => {
        if (!cursor || loading) return
        setLoading(true)
        try {
            const res = await getGalleryImages(cursor)
            if (res.success) {
                setImages((prev) => [...prev, ...res.data])
                setCursor(res.nextCursor)
            }
        } finally {
            setLoading(false)
        }
    }, [cursor, loading])

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Images className="h-5 w-5 text-primary" />
                    </div>
                    معرض صور المنتجات
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    {stats.totalImages} صورة من {stats.totalProducts} منتج
                </p>
            </div>

            {/* Gallery Grid */}
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                    <div className="h-20 w-20 rounded-2xl bg-muted/30 flex items-center justify-center">
                        <Images className="h-10 w-10 opacity-30" />
                    </div>
                    <p className="font-medium">لا توجد صور</p>
                    <p className="text-sm opacity-70">أضف صوراً للمنتجات من صفحة المنتج</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {images.map((img, idx) => (
                            <ImageCard
                                key={`${img.id}-${img.productId}`}
                                image={img}
                                onLightbox={() => setLightboxIndex(idx)}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    {cursor && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={loadMore}
                                disabled={loading}
                                className="gap-2 px-8 rounded-xl"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                                {loading ? "جاري التحميل..." : "عرض المزيد"}
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && images.length > 0 && (
                <Lightbox
                    images={images}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNext={() => setLightboxIndex((i) => i !== null ? (i + 1) % images.length : 0)}
                    onPrev={() => setLightboxIndex((i) => i !== null ? (i - 1 + images.length) % images.length : 0)}
                />
            )}
        </div>
    )
}
