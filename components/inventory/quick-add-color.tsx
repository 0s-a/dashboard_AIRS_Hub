"use client"

import { useState, useCallback } from "react"
import { Plus, Loader2, Palette, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addColorToProduct } from "@/lib/actions/inventory"
import { uploadImage } from "@/lib/actions/upload"
import { useDropzone } from "react-dropzone"
import Image from "next/image"

interface QuickAddColorProps {
    productId: string
    productName: string
    currentColors?: any[] | null
    trigger?: React.ReactNode
}

export function QuickAddColor({
    productId,
    productName,
    currentColors,
    trigger
}: QuickAddColorProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [itemNumber, setItemNumber] = useState("")
    const [colorName, setColorName] = useState("")
    const [colorCode, setColorCode] = useState("#000000")
    const [imagePath, setImagePath] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [nameError, setNameError] = useState('')
    const [codeError, setCodeError] = useState('')
    const [itemNumberError, setItemNumberError] = useState('')

    // Image upload
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await uploadImage(formData)

            if (res.success && res.url) {
                setImagePath(res.url)
                toast.success("تم رفع الصورة بنجاح")
            } else {
                toast.error("فشل رفع الصورة")
            }
        } catch (error) {
            toast.error("حدث خطأ أثناء رفع الصورة")
        } finally {
            setIsUploading(false)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
        disabled: isSubmitting || isUploading
    })

    const handleRemoveImage = () => {
        setImagePath(null)
    }

    // Validate hex color code
    const validateColorCode = (code: string) => {
        const hexPattern = /^#[0-9A-F]{6}$/i
        if (!code) {
            setCodeError('كود اللون مطلوب')
            return false
        }
        if (!hexPattern.test(code)) {
            setCodeError('كود اللون غير صالح (مثال: #FF0000)')
            return false
        }
        setCodeError('')
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate itemNumber
        const trimmedItemNumber = itemNumber.trim()
        if (!trimmedItemNumber) {
            setItemNumberError('رقم اللون مطلوب')
            toast.error("الرجاء إدخال رقم اللون")
            return
        }
        setItemNumberError('')

        const trimmedName = colorName.trim()
        if (!trimmedName) {
            setNameError('اسم اللون مطلوب')
            toast.error("الرجاء إدخال اسم اللون")
            return
        }
        setNameError('')

        if (!validateColorCode(colorCode)) {
            toast.error("الرجاء إدخال كود لون صالح")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addColorToProduct(productId, {
                itemNumber: trimmedItemNumber,
                name: trimmedName,
                code: colorCode,
                imagePath: imagePath || undefined
            })

            if (result.success) {
                toast.success("تم إضافة اللون بنجاح")
                // Reset form
                setItemNumber("")
                setColorName("")
                setColorCode("#000000")
                setImagePath(null)
                setNameError('')
                setCodeError('')
                setItemNumberError('')
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || "فشل إضافة اللون")
            }
        } catch (error) {
            toast.error("حدث خطأ أثناء الإضافة")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs bg-linear-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 border-primary/30 text-primary hover:text-primary/90 transition-all"
                    >
                        <Plus className="h-3.5 w-3.5 ml-1" />
                        إضافة
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        إضافة لون جديد
                    </DialogTitle>
                    <DialogDescription>
                        أضف لون جديد لـ <span className="font-semibold text-foreground">{productName}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Item Number */}
                    <div className="space-y-2">
                        <Label htmlFor="itemNumber">رقم اللون *</Label>
                        <Input
                            id="itemNumber"
                            value={itemNumber}
                            onChange={(e) => {
                                setItemNumber(e.target.value)
                                if (e.target.value.trim()) setItemNumberError('')
                            }}
                            placeholder="مثال: CLR-001"
                            className={`h-11 font-mono ${itemNumberError ? 'border-destructive' : ''}`}
                            disabled={isSubmitting}
                            autoFocus
                            aria-invalid={!!itemNumberError}
                            aria-describedby={itemNumberError ? 'itemNumber-error' : undefined}
                        />
                        {itemNumberError && (
                            <p id="itemNumber-error" className="text-sm text-destructive" role="alert">
                                {itemNumberError}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            رقم فريد يميز هذا اللون
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="colorName">اسم اللون *</Label>
                        <Input
                            id="colorName"
                            value={colorName}
                            onChange={(e) => {
                                setColorName(e.target.value)
                                if (e.target.value.trim()) setNameError('')
                            }}
                            placeholder="مثال: أحمر، أزرق، أخضر"
                            className={`h-11 ${nameError ? 'border-destructive' : ''}`}
                            disabled={isSubmitting}
                            aria-invalid={!!nameError}
                            aria-describedby={nameError ? 'name-error' : undefined}
                        />
                        {nameError && (
                            <p id="name-error" className="text-sm text-destructive" role="alert">
                                {nameError}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="colorCode">كود اللون (Hex)</Label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                id="colorCode"
                                value={colorCode}
                                onChange={(e) => setColorCode(e.target.value)}
                                className="h-11 w-20 rounded-md border border-input cursor-pointer"
                                disabled={isSubmitting}
                            />
                            <Input
                                value={colorCode}
                                onChange={(e) => setColorCode(e.target.value)}
                                placeholder="#000000"
                                className="h-11 flex-1 font-mono"
                                disabled={isSubmitting}
                                maxLength={7}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            اختر اللون أو أدخل الرمز بصيغة hex
                        </p>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>صورة اللون (اختياري)</Label>

                        {imagePath ? (
                            <div className="relative h-32 w-full rounded-lg border-2 border-border overflow-hidden group">
                                <Image
                                    src={imagePath}
                                    alt={colorName || "معاينة"}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleRemoveImage}
                                        disabled={isSubmitting}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        إزالة
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                {...getRootProps()}
                                className={`
                                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                                    ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
                                    ${isSubmitting || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <input {...getInputProps()} />
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">جاري الرفع...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            اسحب الصورة هنا أو اضغط للاختيار
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                        <Label>معاينة</Label>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div
                                className="h-10 w-10 rounded-md border-2 border-border shadow-sm"
                                style={{ backgroundColor: colorCode }}
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium">{colorName || "اسم اللون"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{colorCode}</p>
                            </div>
                        </div>
                    </div>

                    {/* Current Colors */}
                    {currentColors && currentColors.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground font-medium">الألوان الحالية:</p>
                            <div className="flex flex-wrap gap-2">
                                {currentColors.map((color: any, idx: number) => (
                                    <div
                                        key={color.itemNumber || idx}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50"
                                    >
                                        <div
                                            className="h-4 w-4 rounded border border-border"
                                            style={{ backgroundColor: color.code }}
                                        />
                                        <span className="text-xs">{color.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                            className="rounded-xl"
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !colorName.trim() || isUploading}
                            className="rounded-xl bg-linear-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    إضافة
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
