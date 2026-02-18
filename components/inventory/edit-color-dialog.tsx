"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Palette, Loader2, Upload, X, Trash2, Edit, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { updateColorInProduct, deleteColorFromProduct } from "@/lib/actions/inventory"
import { uploadProductImage, deleteProductImage } from "@/lib/actions/upload"
import { useDropzone } from "react-dropzone"
import Image from "next/image"

interface EditColorDialogProps {
    productId: string
    productItemNumber: string
    productName: string
    color: {
        itemNumber: string
        name: string
        code: string
        imagePath?: string | null
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditColorDialog({
    productId,
    productItemNumber,
    productName,
    color,
    open,
    onOpenChange
}: EditColorDialogProps) {
    const router = useRouter()
    const [itemNumber, setItemNumber] = useState(color.itemNumber)
    const [colorName, setColorName] = useState(color.name)
    const [colorCode, setColorCode] = useState(color.code)
    const [imagePath, setImagePath] = useState<string | null>(color.imagePath || null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [itemNumberError, setItemNumberError] = useState('')
    const [nameError, setNameError] = useState('')
    const [codeError, setCodeError] = useState('')
    const replaceInputRef = useRef<HTMLInputElement>(null)

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setItemNumber(color.itemNumber)
            setColorName(color.name)
            setColorCode(color.code)
            setImagePath(color.imagePath || null)
            setItemNumberError('')
            setNameError('')
            setCodeError('')
        }
    }, [open, color])

    // Image upload via dropzone (empty state) or replace input
    const uploadFile = useCallback(async (file: File) => {
        if (!file) return

        if (file.size > 20 * 1024 * 1024) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(1)
            toast.error('الملف كبير جداً', { description: `حجم الملف ${sizeMB}MB يتجاوز الحد الأقصى المسموح (20MB)` })
            return
        }
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'].includes(file.type)) {
            toast.error('صيغة الملف غير مدعومة', { description: 'يُرجى استخدام صيغة JPG أو PNG أو WEBP أو AVIF أو HEIC' })
            return
        }

        setIsUploading(true)
        try {
            const slugPart = color.itemNumber.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
            const colorSlot = slugPart ? `color-${slugPart}` : `color-${Date.now()}`
            const res = await uploadProductImage(file, productItemNumber, colorSlot, 'colors', imagePath)

            if (res.success && res.url) {
                setImagePath(res.url)
                toast.success('تم رفع الصورة', { description: `تم حفظ صورة لون ${colorName || color.name} بنجاح` })
            } else {
                toast.error('فشل رفع الصورة', { description: res.error || 'تعذّر حفظ الصورة، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم أثناء رفع الصورة' })
        } finally {
            setIsUploading(false)
        }
    }, [productItemNumber, color.itemNumber, imagePath])

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) await uploadFile(acceptedFiles[0])
    }, [uploadFile])

    // Handler for replace input
    const handleReplaceInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) await uploadFile(file)
        // reset so same file can be picked again
        if (replaceInputRef.current) replaceInputRef.current.value = ''
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif', '.bmp', '.tiff'] },
        maxFiles: 1,
        maxSize: 20 * 1024 * 1024,
        disabled: isSubmitting || isUploading || !!imagePath,
        onDropRejected: (r) => {
            const err = r[0]?.errors[0]
            if (err?.code === 'file-too-large') {
                toast.error('الملف كبير جداً', { description: 'الحد الأقصى المسموح هو 20MB' })
            } else {
                toast.error('صيغة غير مدعومة', { description: 'يُرجى استخدام JPG أو PNG أو WEBP أو AVIF أو HEIC' })
            }
        }
    })

    const handleRemoveImage = async () => {
        if (!imagePath) return
        try {
            await deleteProductImage(imagePath)
            setImagePath(null)
            toast.success('تم حذف الصورة', { description: 'سيتم حفظ التغيير عند الضغط على "تحديث"' })
        } catch {
            toast.error('فشل حذف الصورة', { description: 'تعذّر حذف الصورة، يُرجى المحاولة مجدداً' })
        }
    }

    // Real-time validation for hex color code
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

        // Validation: itemNumber
        const trimmedItemNumber = itemNumber.trim()
        if (!trimmedItemNumber) {
            setItemNumberError('رقم اللون مطلوب')
            toast.error("الرجاء إدخال رقم اللون")
            return
        }
        setItemNumberError('')

        // Validation
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
            const result = await updateColorInProduct(productId, color.itemNumber, {
                itemNumber: trimmedItemNumber,
                name: trimmedName,
                code: colorCode,
                imagePath: imagePath
            })

            if (result.success) {
                toast.success('تم تحديث اللون', { description: `تم حفظ بيانات لون "${trimmedName}" بنجاح` })
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error('فشل تحديث اللون', { description: result.error || 'تعذّر حفظ التغييرات، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى التحقق من الاتصال والمحاولة مجدداً' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = () => {
        setShowDeleteAlert(true)
    }

    const handleDeleteConfirm = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteColorFromProduct(productId, color.itemNumber)

            if (result.success) {
                toast.success('تم حذف اللون', { description: `تم حذف لون "${color.name}" من المنتج بنجاح` })
                setShowDeleteAlert(false)
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error('فشل حذف اللون', { description: result.error || 'تعذّر حذف اللون، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم أثناء محاولة الحذف' })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[550px]" aria-describedby="edit-color-description">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-primary" aria-hidden="true" />
                            تعديل اللون
                        </DialogTitle>
                        <DialogDescription id="edit-color-description">
                            تعديل لون <span className="font-semibold text-foreground">{productName}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Item Number - Now Editable */}
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
                                aria-invalid={!!itemNumberError}
                                aria-describedby={itemNumberError ? 'itemNumber-error' : undefined}
                            />
                            {itemNumberError && (
                                <p id="itemNumber-error" className="text-sm text-destructive" role="alert">
                                    {itemNumberError}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                رقم فريد يميز هذا اللون (الرقم القديم: {color.itemNumber})
                            </p>
                        </div>

                        {/* Color Name */}
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
                                autoFocus
                            />
                            {nameError && (
                                <p id="name-error" className="text-sm text-destructive" role="alert">
                                    {nameError}
                                </p>
                            )}
                        </div>

                        {/* Color Code */}
                        <div className="space-y-2">
                            <Label htmlFor="colorCode">كود اللون (Hex) *</Label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    id="colorCode"
                                    value={colorCode}
                                    onChange={(e) => {
                                        setColorCode(e.target.value.toUpperCase())
                                        validateColorCode(e.target.value.toUpperCase())
                                    }}
                                    className="h-11 w-20 rounded-md border border-input cursor-pointer"
                                    disabled={isSubmitting}
                                    aria-label="منتقي اللون"
                                />
                                <Input
                                    value={colorCode}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase()
                                        setColorCode(value)
                                        validateColorCode(value)
                                    }}
                                    onBlur={() => validateColorCode(colorCode)}
                                    placeholder="#000000"
                                    className={`h-11 flex-1 font-mono ${codeError ? 'border-destructive' : ''}`}
                                    disabled={isSubmitting}
                                    maxLength={7}
                                    aria-invalid={!!codeError}
                                    aria-describedby={codeError ? 'code-error' : undefined}
                                />
                            </div>
                            {codeError && (
                                <p id="code-error" className="text-sm text-destructive" role="alert">
                                    {codeError}
                                </p>
                            )}
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label>صورة اللون (اختياري)</Label>

                            {/* Hidden input for replacing existing image */}
                            <input
                                ref={replaceInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleReplaceInput}
                                disabled={isSubmitting || isUploading}
                            />

                            {imagePath ? (
                                <div className="space-y-2">
                                    <div className="relative h-36 w-full rounded-xl border-2 border-border overflow-hidden group">
                                        <Image
                                            src={imagePath}
                                            alt={colorName || "معاينة"}
                                            fill
                                            className="object-cover"
                                        />
                                        {/* Color swatch badge */}
                                        <div
                                            className="absolute top-2 right-2 h-6 w-6 rounded-full border-2 border-white shadow-md z-10 transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: colorCode }}
                                            title={colorCode}
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                disabled={isUploading || isSubmitting}
                                                onClick={() => replaceInputRef.current?.click()}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" />
                                                ) : (
                                                    <Upload className="h-3.5 w-3.5 ml-1" />
                                                )}
                                                تغيير
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={handleRemoveImage}
                                                disabled={isSubmitting || isUploading}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 ml-1" />
                                                حذف
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">مرّر الفأرة لتغيير الصورة أو حذفها</p>
                                </div>
                            ) : (
                                <div
                                    {...getRootProps()}
                                    className={`
                                    border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                                    ${isDragActive ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20'}
                                    ${isSubmitting || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                >
                                    <input {...getInputProps()} />
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">جاري الرفع...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="relative">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <div
                                                    className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background"
                                                    style={{ backgroundColor: colorCode }}
                                                />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {isDragActive ? 'افلت الصورة هنا' : 'اسحب الصورة هنا أو اضغط للاختيار'}
                                            </p>
                                            <p className="text-xs text-muted-foreground/60">JPG، PNG، WEBP، AVIF، HEIC — حتى 20MB</p>
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

                        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteClick}
                                disabled={isSubmitting || isDeleting}
                                className="sm:mr-auto"
                                aria-label="حذف اللون"
                            >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                حذف اللون
                            </Button>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting || isDeleting}
                                    className="flex-1 sm:flex-none"
                                >
                                    إلغاء
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isDeleting || !colorName.trim() || !!nameError || !!codeError}
                                    className="flex-1 sm:flex-none"
                                    aria-label="حفظ التعديلات"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                            جاري الحفظ...
                                        </>
                                    ) : (
                                        <>
                                            <Palette className="mr-2 h-4 w-4" aria-hidden="true" />
                                            حفظ التعديلات
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                            تأكيد حذف اللون
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من حذف اللون <span className="font-semibold text-foreground">{colorName}</span>؟
                            <br />
                            <span className="text-destructive">هذا الإجراء لا يمكن التراجع عنه وسيتم حذف صورة اللون أيضاً.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            إلغاء
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                    جاري الحذف...
                                </>
                            ) : (
                                'نعم، حذف اللون'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
