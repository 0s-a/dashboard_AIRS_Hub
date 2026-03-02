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
    Tag,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    addProductImage,
    removeProductImage,
    setPrimaryProductImage,
    reorderProductImages,
    toggleVariantForProductImage,
} from "@/lib/actions/product-images"
import type { ProductImageRecord } from "@/lib/actions/product-images"
import type { VariantRecord } from "@/lib/actions/variants"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadingImage {
    id: string
    file: File
    preview: string
    progress: number
    error?: string
}

interface ImageGalleryUploadProps {
    images: ProductImageRecord[]
    productId: string
    productItemNumber: string
    variants?: VariantRecord[]
    maxImages?: number
    disabled?: boolean
    className?: string
    onImagesChange?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageGalleryUpload({
    images,
    productId,
    productItemNumber,
    variants = [],
    maxImages = 10,
    disabled = false,
    className,
    onImagesChange,
}: ImageGalleryUploadProps) {
    const [uploading, setUploading] = useState<UploadingImage[]>([])
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [settingPrimary, setSettingPrimary] = useState<string | null>(null)
    const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null)
    const dragItem = useRef<number | null>(null)

    const canUploadMore = images.length + uploading.length < maxImages

    // ── Upload handler ────────────────────────────────────────────────────────

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
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

            // Upload each file via server action
            let uploadedCount = 0
            for (const item of newUploading) {
                setUploading((prev) =>
                    prev.map((u) => (u.id === item.id ? { ...u, progress: 30 } : u))
                )

                const result = await addProductImage(productId, item.file)

                setUploading((prev) =>
                    prev.map((u) =>
                        u.id === item.id
                            ? { ...u, progress: result.success ? 100 : 0, error: result.error }
                            : u
                    )
                )

                if (result.success) {
                    uploadedCount++
                } else if (result.error) {
                    toast.error('فشل رفع صورة', { description: result.error })
                }

                URL.revokeObjectURL(item.preview)
            }

            if (uploadedCount > 0) {
                toast.success(
                    uploadedCount === 1 ? 'تم رفع الصورة' : `تم رفع ${uploadedCount} صور`,
                    { description: 'تم ضغط الصور وتحويلها إلى WebP تلقائياً' }
                )
                onImagesChange?.()
            }

            // Clear uploading state
            setUploading((prev) =>
                prev.filter((u) => !newUploading.find((n) => n.id === u.id))
            )
        },
        [images, uploading, productId, maxImages, onImagesChange]
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

    const handleSetPrimary = async (imageId: string) => {
        setSettingPrimary(imageId)
        const result = await setPrimaryProductImage(imageId)
        setSettingPrimary(null)
        if (result.success) {
            onImagesChange?.()
        } else {
            toast.error('فشل تعيين الصورة الرئيسية', { description: result.error })
        }
    }

    const handleRemoveImage = async (imageId: string) => {
        setRemovingId(imageId)
        const result = await removeProductImage(imageId)
        setRemovingId(null)
        if (result.success) {
            toast.success('تم حذف الصورة')
            onImagesChange?.()
        } else {
            toast.error('فشل حذف الصورة', { description: result.error })
        }
    }

    const handleSetVariant = async (imageId: string, variantId: string) => {
        setUpdatingVariantId(imageId)
        const result = await toggleVariantForProductImage(imageId, variantId)
        setUpdatingVariantId(null)
        if (result.success) {
            onImagesChange?.()
        } else {
            toast.error('فشل تحديث المتغير', { description: result.error })
        }
    }

    // ── Drag to reorder ───────────────────────────────────────────────────────

    const handleDragStart = (index: number) => {
        dragItem.current = index
    }

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index)
    }

    const handleDragEnd = async () => {
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

            // Send new order to server
            await reorderProductImages(reordered.map(img => img.id))
            onImagesChange?.()
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
                        رتب الصور أو اسحبها لتعيين العلاقة مع المتغيرات
                    </p>
                )}
            </div>

            {/* Grid */}
            {(images.length > 0 || uploading.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {/* Existing images */}
                    {images.map((img, index) => {
                        const linkedVariants = variants.filter(v => img.variantIds?.includes(v.id))
                        
                        return (
                            <div
                                key={img.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className={cn(
                                    "group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-grab active:cursor-grabbing",
                                    img.isPrimary
                                        ? "border-primary shadow-md shadow-primary/20"
                                        : linkedVariants.length > 0
                                            ? "border-primary/40 shadow-sm"
                                            : "border-border/50 hover:border-primary/40",
                                    dragOverIndex === index && "border-primary border-dashed scale-95 opacity-70",
                                    (removingId === img.id || updatingVariantId === img.id) && "opacity-50 pointer-events-none"
                                )}
                            >
                                <Image
                                    src={img.url}
                                    alt={img.alt || `صورة ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 33vw, 25vw"
                                />

                                {/* Overlay Buttons (Visible on hover) */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 p-1">
                                    <div className="flex gap-1.5">
                                        {/* Set primary */}
                                        <button
                                            type="button"
                                            onClick={() => handleSetPrimary(img.id)}
                                            disabled={settingPrimary === img.id}
                                            className={cn(
                                                "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full",
                                                img.isPrimary
                                                    ? "bg-primary text-white opacity-100"
                                                    : "bg-white/90 text-amber-500 hover:bg-amber-50"
                                            )}
                                            title={img.isPrimary ? "الصورة الرئيسية" : "تعيين كصورة رئيسية"}
                                        >
                                            {settingPrimary === img.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Star className={cn("h-3.5 w-3.5", img.isPrimary && "fill-current")} />
                                            )}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(img.id)}
                                            disabled={removingId === img.id}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-destructive/90 text-white hover:bg-destructive"
                                            title="حذف الصورة"
                                        >
                                            {removingId === img.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <X className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Variant Selector Button */}
                                    {variants.length > 0 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className={cn(
                                                        "opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm whitespace-nowrap",
                                                        linkedVariants.length > 0 
                                                            ? "bg-primary text-white" 
                                                            : "bg-white/90 text-foreground hover:bg-white"
                                                    )}
                                                >
                                                    {updatingVariantId === img.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Tag className="h-3 w-3" />
                                                    )}
                                                    {linkedVariants.length > 0 ? `${linkedVariants.length} متغيرات` : "ربط بمتغير"}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center" className="w-48">
                                                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    اختر المتغير
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {variants.map(v => (
                                                    <DropdownMenuItem 
                                                        key={v.id} 
                                                        onClick={(e) => {
                                                            e.preventDefault() // prevent closing menu
                                                            handleSetVariant(img.id, v.id)
                                                        }}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                    >
                                                        {v.hex ? (
                                                            <div className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: v.hex }} />
                                                        ) : (
                                                            <div className="h-3 w-3 rounded-full bg-muted border border-border" />
                                                        )}
                                                        <span className="flex-1">{v.name}</span>
                                                        <span className="text-[10px] font-mono text-muted-foreground">{v.suffix}</span>
                                                        {img.variantIds?.includes(v.id) && <Check className="h-3 w-3 ml-auto text-primary" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                {/* Persistent Badges (Always visible) */}
                                <div className="absolute top-1 right-1 flex flex-col items-end gap-1 pointer-events-none">
                                    {/* Primary badge */}
                                    {img.isPrimary && (
                                        <div className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                                            <Star className="h-2 w-2 fill-current" />
                                            رئيسية
                                        </div>
                                    )}
                                    
                                    {/* Variant Badges */}
                                    {linkedVariants.map(v => (
                                        <div key={v.id} className="bg-background/90 backdrop-blur-sm text-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-border/50 shadow-sm flex items-center gap-1">
                                            {v.hex && (
                                                <div className="h-2 w-2 rounded-full border border-black/10" style={{ backgroundColor: v.hex }} />
                                            )}
                                            {v.name}
                                        </div>
                                    ))}
                                </div>

                                {/* Drag handle */}
                                <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                                    <GripVertical className="h-3.5 w-3.5 text-white" />
                                </div>
                            </div>
                        )
                    })}

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
        </div>
    )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}
