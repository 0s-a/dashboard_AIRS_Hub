"use client"

import { useState } from "react"
import { Plus, Loader2, Box } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { addVariantToProduct } from "@/lib/actions/inventory"

interface QuickAddVariantProps {
    productId: string
    productName: string
    basePrice?: number
    currentVariants?: any[] | null
    trigger?: React.ReactNode
}

export function QuickAddVariant({
    productId,
    productName,
    basePrice,
    currentVariants,
    trigger
}: QuickAddVariantProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [variantName, setVariantName] = useState("")
    const [variantPrice, setVariantPrice] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedName = variantName.trim()
        if (!trimmedName) {
            toast.error('حقل مطلوب', { description: 'يُرجى إدخال اسم الخيار قبل الحفظ' })
            return
        }

        // Validate price if provided
        if (variantPrice && (isNaN(Number(variantPrice)) || Number(variantPrice) < 0)) {
            toast.error('السعر غير صالح', { description: 'يُرجى إدخال رقم موجب صحيح للسعر' })
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addVariantToProduct(productId, {
                name: trimmedName,
                price: variantPrice || undefined
            })

            if (result.success) {
                toast.success('تم إضافة الخيار', { description: `تم إضافة خيار "${trimmedName}" بنجاح` })
                setVariantName("")
                setVariantPrice("")
                setOpen(false)
                router.refresh()
            } else {
                toast.error('فشل إضافة الخيار', { description: result.error || 'تعذّر حفظ الخيار، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى المحاولة مجدداً' })
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
                        className="h-8 px-3 text-xs bg-linear-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-blue-300 text-blue-700 hover:text-blue-800 transition-all"
                    >
                        <Plus className="h-3.5 w-3.5 ml-1" />
                        إضافة
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-blue-600" />
                        إضافة خيار جديد
                    </DialogTitle>
                    <DialogDescription>
                        أضف خياراً جديداً لـ <span className="font-semibold text-foreground">{productName}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="variantName">اسم الخيار *</Label>
                        <Input
                            id="variantName"
                            value={variantName}
                            onChange={(e) => setVariantName(e.target.value)}
                            placeholder="مثال: كبير، صغير، عبوة 500 غرام"
                            className="h-11"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="variantPrice">
                            السعر (اختياري)
                            {basePrice && (
                                <span className="text-xs text-muted-foreground mr-2">
                                    السعر الأساسي: {basePrice.toFixed(2)} ر.ي
                                </span>
                            )}
                        </Label>
                        <Input
                            id="variantPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={variantPrice}
                            onChange={(e) => setVariantPrice(e.target.value)}
                            placeholder="اترك فارغاً لاستخدام السعر الأساسي"
                            className="h-11"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                            إذا لم تحدد سعراً، سيتم استخدام السعر الأساسي للمنتج
                        </p>
                    </div>

                    {/* Preview */}
                    {variantName && (
                        <div className="space-y-2">
                            <Label>معاينة</Label>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                <Box className="h-8 w-8 text-blue-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{variantName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {variantPrice ? `${Number(variantPrice).toFixed(2)} ر.ي` : 'السعر الأساسي'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Variants */}
                    {currentVariants && currentVariants.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground font-medium">الخيارات الحالية:</p>
                            <div className="flex flex-wrap gap-2">
                                {currentVariants.map((variant: any, idx: number) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                        {variant.name}
                                        {variant.price && (
                                            <span className="mr-1 text-blue-600">
                                                ({Number(variant.price).toFixed(2)} ر.ي)
                                            </span>
                                        )}
                                    </Badge>
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
                            disabled={isSubmitting || !variantName.trim()}
                            className="rounded-xl bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
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
