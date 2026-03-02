"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import Image from "next/image"
import { UploadCloud, X, Loader2, AlertCircle, CheckCircle2, ImagePlus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { saveGalleryImage } from "@/lib/actions/gallery"

interface UploadItem {
    id: string
    preview: string
    filename: string
    progress: number
    error?: string
    done?: boolean
}

interface GalleryUploadZoneProps {
    onUploadComplete: () => void
}

export function GalleryUploadZone({ onUploadComplete }: GalleryUploadZoneProps) {
    const [items, setItems] = useState<UploadItem[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!acceptedFiles.length) return

        const newItems: UploadItem[] = acceptedFiles.map(f => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            preview: URL.createObjectURL(f),
            filename: f.name,
            progress: 0,
        }))

        setItems(prev => [...prev, ...newItems])
        setIsExpanded(true)

        // Upload each file
        await Promise.all(newItems.map(async (item, i) => {
            const file = acceptedFiles[i]

            setItems(prev => prev.map(u => u.id === item.id ? { ...u, progress: 30 } : u))

            const res = await saveGalleryImage(file)

            setItems(prev => prev.map(u =>
                u.id === item.id
                    ? { ...u, progress: 100, done: res.success, error: res.error }
                    : u
            ))

            if (!res.success) {
                toast.error(`فشل رفع ${file.name}`, { description: res.error })
            }

            URL.revokeObjectURL(item.preview)
        }))

        // All done
        const allDone = true
        if (allDone) {
            onUploadComplete()
            setTimeout(() => {
                setItems(prev => prev.filter(u => u.error))
            }, 2000)
        }
    }, [onUploadComplete])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic'] },
        maxSize: 20 * 1024 * 1024,
        onDropRejected: rejections => {
            rejections.forEach(r => {
                if (r.errors[0]?.code === 'file-too-large') {
                    toast.error('الملف كبير جداً', { description: `${r.file.name} — الحد 20MB` })
                } else {
                    toast.error('صيغة غير مدعومة', { description: r.file.name })
                }
            })
        }
    })

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(u => u.id !== id))
    }

    return (
        <div className="space-y-3">
            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={cn(
                    "relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden",
                    isDragActive
                        ? "border-primary bg-primary/5 scale-[0.99] shadow-lg shadow-primary/10"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/20"
                )}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3 py-8 px-6">
                    <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                        isDragActive ? "bg-primary/15 scale-110" : "bg-muted/50"
                    )}>
                        {isDragActive ? (
                            <ImagePlus className="h-8 w-8 text-primary animate-bounce" />
                        ) : (
                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        )}
                    </div>
                    <div className="text-center space-y-1">
                        <p className="font-semibold text-sm">
                            {isDragActive ? "أفلت الصور هنا" : "اسحب الصور هنا أو اضغط للاختيار"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            JPG، PNG، WEBP، AVIF، HEIC — حد أقصى 20MB للصورة
                        </p>
                        <p className="text-xs text-muted-foreground">
                            يمكن رفع صور متعددة في نفس الوقت
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Progress */}
            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1"
                        >
                            <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                                <Image
                                    src={item.preview}
                                    alt={item.filename}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-xs font-medium truncate">{item.filename}</p>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            item.error ? "bg-destructive" : item.done ? "bg-emerald-500" : "bg-primary"
                                        )}
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            </div>
                            <div className="shrink-0">
                                {item.error ? (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                ) : item.done ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {(item.error || item.done) && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="shrink-0 h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
