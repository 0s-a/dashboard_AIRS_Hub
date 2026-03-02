"use client"

import { useState, useTransition, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
    Images,
    Search,
    Filter,
    Link2,
    Link2Off,
    Trash2,
    Package,
    LayoutGrid,
    Loader2,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    Download,
    ZoomIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { deleteGalleryImage } from "@/lib/actions/gallery"
import { GalleryUploadZone } from "@/components/gallery/gallery-upload-zone"
import { LinkToProductDialog } from "@/components/gallery/link-to-product-dialog"
import type { GalleryImageData } from "@/lib/actions/gallery"

// ─── Types ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'linked' | 'unlinked'

interface GalleryClientProps {
    initialImages: GalleryImageData[]
    stats: { total: number; linked: number; unlinked: number }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
    images,
    index,
    onClose,
    onNext,
    onPrev,
}: {
    images: GalleryImageData[]
    index: number
    onClose: () => void
    onNext: () => void
    onPrev: () => void
}) {
    const img = images[index]
    if (!img) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close */}
            <button
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
                onClick={onClose}
            >
                <X className="h-6 w-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full">
                {index + 1} / {images.length}
            </div>

            {/* Product badge */}
            {img.product && (
                <div className="absolute top-4 left-4 bg-primary/90 text-white text-xs px-3 py-1 rounded-full">
                    {img.product.name}
                </div>
            )}

            {/* Prev */}
            {images.length > 1 && (
                <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all"
                    onClick={e => { e.stopPropagation(); onPrev() }}
                >
                    <ChevronRight className="h-8 w-8" />
                </button>
            )}

            {/* Image */}
            <div
                className="relative max-w-5xl max-h-[85vh] w-full h-full mx-20"
                onClick={e => e.stopPropagation()}
            >
                <Image
                    src={img.url}
                    alt={img.alt || img.filename}
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {/* Next */}
            {images.length > 1 && (
                <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all"
                    onClick={e => { e.stopPropagation(); onNext() }}
                >
                    <ChevronLeft className="h-8 w-8" />
                </button>
            )}

            {/* Bottom info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white/60 text-xs">
                <span>{img.filename}</span>
                {img.width && img.height && <span>{img.width}×{img.height}</span>}
                {img.sizeBytes && <span>{(img.sizeBytes / 1024).toFixed(0)}KB</span>}
                <a
                    href={img.url}
                    download={img.filename}
                    onClick={e => e.stopPropagation()}
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
    onLink,
    onDelete,
}: {
    image: GalleryImageData
    onLightbox: () => void
    onLink: () => void
    onDelete: () => void
}) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)
        const res = await deleteGalleryImage(image.id)
        if (res.success) {
            toast.success('تم حذف الصورة')
            onDelete()
        } else {
            toast.error('فشل الحذف', { description: res.error })
            setDeleting(false)
        }
    }

    return (
        <div className="group relative rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 bg-muted/10 hover:-translate-y-0.5">
            {/* Image */}
            <div
                className="aspect-square relative cursor-zoom-in overflow-hidden"
                onClick={onLightbox}
            >
                <Image
                    src={image.url}
                    alt={image.alt || image.filename}
                    fill
                    className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                </div>

                {/* Top badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {image.product && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-primary/90 text-white border-0 backdrop-blur-sm shadow-md">
                            {image.product.name}
                        </Badge>
                    )}
                </div>

                {/* Action buttons top right */}
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button
                                type="button"
                                disabled={deleting}
                                className="h-7 w-7 rounded-full bg-destructive/80 backdrop-blur text-white flex items-center justify-center hover:bg-destructive transition-colors"
                                onClick={e => e.stopPropagation()}
                            >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>حذف الصورة؟</AlertDialogTitle>
                                <AlertDialogDescription>سيتم حذف الصورة نهائياً من المعرض والقرص. لا يمكن التراجع.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                    حذف
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 space-y-2">
                <p className="text-xs font-medium truncate text-muted-foreground">{image.filename}</p>
                <div className="flex items-center gap-1.5">
                    {image.width && image.height && (
                        <span className="text-[10px] text-muted-foreground/60">{image.width}×{image.height}</span>
                    )}
                    {image.sizeBytes && (
                        <span className="text-[10px] text-muted-foreground/60">• {(image.sizeBytes / 1024).toFixed(0)}KB</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onLink}
                    className={`w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-all ${image.productId
                        ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                        : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                        }`}
                >
                    {image.productId ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
                    {image.product ? `مرتبط: ${image.product.name}` : 'ربط بمنتج'}
                </button>
            </div>
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function GalleryClient({ initialImages, stats }: GalleryClientProps) {
    const router = useRouter()
    const [images, setImages] = useState<GalleryImageData[]>(initialImages)
    const [filter, setFilter] = useState<Filter>('all')
    const [search, setSearch] = useState("")
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [linkTarget, setLinkTarget] = useState<GalleryImageData | null>(null)
    const [isPending, startTransition] = useTransition()

    const refresh = useCallback(() => {
        startTransition(() => router.refresh())
    }, [router])

    // Filter + search
    const filtered = images
        .filter(img => {
            if (filter === 'linked') return !!img.productId
            if (filter === 'unlinked') return !img.productId
            return true
        })
        .filter(img => {
            if (!search.trim()) return true
            const q = search.toLowerCase()
            return (
                img.filename.toLowerCase().includes(q) ||
                img.product?.name.toLowerCase().includes(q) ||
                img.product?.itemNumber.toLowerCase().includes(q) ||
                img.alt?.toLowerCase().includes(q)
            )
        })

    const filterBtns: { key: Filter; label: string; count: number }[] = [
        { key: 'all', label: 'الكل', count: stats.total },
        { key: 'linked', label: 'مرتبطة', count: stats.linked },
        { key: 'unlinked', label: 'غير مرتبطة', count: stats.unlinked },
    ]

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Images className="h-5 w-5 text-primary" />
                        </div>
                        معرض الصور
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {stats.total} صورة — {stats.linked} مرتبطة بمنتجات، {stats.unlinked} غير مرتبطة
                    </p>
                </div>
            </div>

            {/* Upload Zone */}
            <div className="glass-panel rounded-2xl p-5 border border-border/50">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                    <LayoutGrid className="h-4 w-4" />
                    رفع صور جديدة
                </h2>
                <GalleryUploadZone onUploadComplete={refresh} />
            </div>

            {/* Filters + Search */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في الصور..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pr-9"
                    />
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border/50 bg-muted/20" role="group">
                    {filterBtns.map(btn => (
                        <button
                            key={btn.key}
                            type="button"
                            onClick={() => setFilter(btn.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === btn.key
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                        >
                            {btn.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === btn.key ? 'bg-white/20' : 'bg-muted'}`}>
                                {btn.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Gallery Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                    <div className="h-20 w-20 rounded-2xl bg-muted/30 flex items-center justify-center">
                        <Images className="h-10 w-10 opacity-30" />
                    </div>
                    <p className="font-medium">لا توجد صور</p>
                    <p className="text-sm opacity-70">ارفع صوراً جديدة للبدء</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filtered.map((img, idx) => (
                        <ImageCard
                            key={img.id}
                            image={img}
                            onLightbox={() => setLightboxIndex(idx)}
                            onLink={() => setLinkTarget(img)}
                            onDelete={refresh}
                        />
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && filtered.length > 0 && (
                <Lightbox
                    images={filtered}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNext={() => setLightboxIndex(i => i !== null ? (i + 1) % filtered.length : 0)}
                    onPrev={() => setLightboxIndex(i => i !== null ? (i - 1 + filtered.length) % filtered.length : 0)}
                />
            )}

            {/* Link Dialog */}
            {linkTarget && (
                <LinkToProductDialog
                    image={linkTarget}
                    open={!!linkTarget}
                    onOpenChange={open => { if (!open) setLinkTarget(null) }}
                    onSuccess={refresh}
                />
            )}
        </div>
    )
}
