"use client"

import { useState, useCallback, useRef } from "react"
import { useDropzone } from "react-dropzone"
import Image from "next/image"
import {
    UploadCloud,
    X,
    Star,
    Loader2,
    ImageIcon,
    GripVertical,
    AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { uploadProductImage } from "@/lib/actions/upload"
import type { ProductImage } from "@/lib/types/product"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadingImage {
    id: string
    file: File
    preview: string
    progress: number
    error?: string
}

interface ImageGalleryUploadProps {
    images: ProductImage[]
    onChange: (images: ProductImage[]) => void
    productItemNumber: string
    maxImages?: number
    disabled?: boolean
    className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageGalleryUpload({
    images,
    onChange,
    productItemNumber,
    maxImages = 10,
    disabled = false,
    className,
}: ImageGalleryUploadProps) {
    const [uploading, setUploading] = useState<UploadingImage[]>([])
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const dragItem = useRef<number | null>(null)

    const canUploadMore = images.length + uploading.length < maxImages

    // ── Upload handler ────────────────────────────────────────────────────────

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!productItemNumber?.trim()) {
                toast.error('حقل مطلوب', { description: 'يُرجى إدخال رقم الصنف أولاً قبل رفع الصور' })
                return
            }

            const remaining = maxImages - images.length - uploading.length
            const filesToUpload = acceptedFiles.slice(0, remaining)

            if (acceptedFiles.length > remaining) {
                toast.warning(`تم تجاهل ${acceptedFiles.length - remaining} صورة`, {
                    description: `الحد الأقصى ${maxImages} صور — تم رفع ${remaining} فقط`
                })
            }

            if (filesToUpload.length === 0) return

            // Create preview entries
            const newUploading: UploadingImage[] = filesToUpload.map((file) => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                preview: URL.createObjectURL(file),
                progress: 0,
            }))

            setUploading((prev) => [...prev, ...newUploading])

            // Upload each file
            const results = await Promise.all(
                newUploading.map(async (item, i) => {
                    const isFirst = images.length === 0 && i === 0
                    const slot = isFirst ? "main" : `gallery-${Date.now()}-${i}`

                    // Simulate progress
                    setUploading((prev) =>
                        prev.map((u) => (u.id === item.id ? { ...u, progress: 30 } : u))
                    )

                    const result = await uploadProductImage(item.file, productItemNumber, slot)

                    setUploading((prev) =>
                        prev.map((u) =>
                            u.id === item.id
                                ? { ...u, progress: result.success ? 100 : 0, error: result.error }
                                : u
                        )
                    )

                    return { item, result, isFirst }
                })
            )

            // Add successful uploads to images
            const newImages: ProductImage[] = []
            results.forEach(({ item, result, isFirst }) => {
                if (result.success && result.url) {
                    newImages.push({
                        url: result.url,
                        alt: "",
                        isPrimary: isFirst && images.length === 0,
                        order: images.length + newImages.length,
                    })
                } else if (result.error) {
                    toast.error('فشل رفع صورة', { description: result.error })
                }
                URL.revokeObjectURL(item.preview)
            })

            if (newImages.length > 0) {
                onChange([...images, ...newImages])
                toast.success(
                    newImages.length === 1 ? 'تم رفع الصورة' : `تم رفع ${newImages.length} صور`,
                    { description: 'تم ضغط الصور وتحويلها إلى WebP تلقائياً' }
                )
            }

            // Clear uploading state for completed items
            setUploading((prev) =>
                prev.filter((u) => !newUploading.find((n) => n.id === u.id))
            )
        },
        [images, uploading, onChange, productItemNumber, maxImages]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif", ".bmp", ".tiff", ".tif"],
        },
        maxSize: 20 * 1024 * 1024,
        disabled: disabled || !canUploadMore,
        onDropRejected: (rejections) => {
            rejections.forEach((r) => {
                if (r.errors[0]?.code === "file-too-large") {
                    const sizeMB = (r.file.size / 1024 / 1024).toFixed(1)
                    toast.error('الملف كبير جداً', { description: `${r.file.name} (${sizeMB}MB) — الحد الأقصى 20MB` })
                } else if (r.errors[0]?.code === "file-invalid-type") {
                    toast.error('صيغة غير مدعومة', { description: `${r.file.name} — يُرجى استخدام JPG أو PNG أو WEBP أو AVIF` })
                }
            })
        },
    })

    // ── Actions ───────────────────────────────────────────────────────────────

    const setPrimary = (index: number) => {
        const updated = images.map((img, i) => ({ ...img, isPrimary: i === index }))
        onChange(updated)
    }

    const removeImage = (index: number) => {
        const updated = images.filter((_, i) => i !== index)
        // Ensure there's still a primary if we removed it
        if (images[index].isPrimary && updated.length > 0) {
            updated[0] = { ...updated[0], isPrimary: true }
        }
        onChange(updated.map((img, i) => ({ ...img, order: i })))
    }

    // ── Drag to reorder ───────────────────────────────────────────────────────

    const handleDragStart = (index: number) => {
        dragItem.current = index
    }

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index)
    }

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverIndex === null) {
            dragItem.current = null
            setDragOverIndex(null)
            return
        }

        const from = dragItem.current
        const to = dragOverIndex

        if (from !== to) {
            const reordered = [...images]
            const [moved] = reordered.splice(from, 1)
            reordered.splice(to, 0, moved)
            onChange(reordered.map((img, i) => ({ ...img, order: i })))
        }

        dragItem.current = null
        setDragOverIndex(null)
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                        صور المنتج
                    </span>
                    <span className="text-xs text-muted-foreground">
                        ({images.length}/{maxImages})
                    </span>
                </div>
                {images.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        اضغط ⭐ لتعيين الصورة الرئيسية
                    </p>
                )}
            </div>

            {/* Grid */}
            {(images.length > 0 || uploading.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {/* Existing images */}
                    {images.map((img, index) => (
                        <div
                            key={img.url}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            className={cn(
                                "group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-grab active:cursor-grabbing",
                                img.isPrimary
                                    ? "border-primary shadow-md shadow-primary/20"
                                    : "border-border/50 hover:border-primary/40",
                                dragOverIndex === index && "border-primary border-dashed scale-95 opacity-70"
                            )}
                        >
                            <Image
                                src={img.url}
                                alt={img.alt || `صورة ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, 25vw"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-1.5">
                                {/* Set primary */}
                                <button
                                    type="button"
                                    onClick={() => setPrimary(index)}
                                    className={cn(
                                        "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full",
                                        img.isPrimary
                                            ? "bg-primary text-white opacity-100"
                                            : "bg-white/90 text-amber-500 hover:bg-amber-50"
                                    )}
                                    title={img.isPrimary ? "الصورة الرئيسية" : "تعيين كصورة رئيسية"}
                                >
                                    <Star className={cn("h-3.5 w-3.5", img.isPrimary && "fill-current")} />
                                </button>

                                {/* Delete */}
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-destructive/90 text-white hover:bg-destructive"
                                    title="حذف الصورة"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Primary badge */}
                            {img.isPrimary && (
                                <div className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                    رئيسية
                                </div>
                            )}

                            {/* Drag handle */}
                            <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                                <GripVertical className="h-3.5 w-3.5 text-white" />
                            </div>
                        </div>
                    ))}

                    {/* Uploading placeholders */}
                    {uploading.map((item) => (
                        <div
                            key={item.id}
                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/30 bg-muted/30"
                        >
                            <Image
                                src={item.preview}
                                alt="جاري الرفع"
                                fill
                                className="object-cover opacity-50"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30">
                                {item.error ? (
                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                ) : (
                                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                                )}
                                {/* Progress bar */}
                                <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Upload button (inline) */}
                    {canUploadMore && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200",
                                isDragActive
                                    ? "border-primary bg-primary/10 scale-95"
                                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <input {...getInputProps()} />
                            <UploadCloud className={cn("h-6 w-6", isDragActive ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
                                {isDragActive ? "أفلت هنا" : "إضافة صورة"}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Empty drop zone */}
            {images.length === 0 && uploading.length === 0 && (
                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                        isDragActive
                            ? "border-primary bg-primary/5 scale-[0.99]"
                            : "border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/20",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3">
                        <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
                            isDragActive ? "bg-primary/10" : "bg-muted/50"
                        )}>
                            <UploadCloud className={cn("h-7 w-7", isDragActive ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">
                                {isDragActive ? "أفلت الصور هنا" : "اسحب الصور هنا أو اضغط للاختيار"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                JPG، PNG، WEBP، GIF، AVIF، HEIC — حد أقصى 20MB
                            </p>
                            <p className="text-xs text-muted-foreground">
                                يمكن رفع حتى {maxImages} صور
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning: no itemNumber */}
            {!productItemNumber?.trim() && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    أدخل رقم الصنف أولاً لتتمكن من رفع الصور
                </p>
            )}
        </div>
    )
}
