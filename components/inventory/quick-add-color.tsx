"use client"

import { useState } from "react"
import { Palette, Plus, Loader2, X } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { addVariant, removeVariant } from "@/lib/actions/variants"

interface QuickAddColorProps {
    productId: string
    productName: string
    currentColors?: string[] | null
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
    const [newColor, setNewColor] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [removingColor, setRemovingColor] = useState<string | null>(null)

    const handleRemoveColor = async (e: React.MouseEvent, colorToRemove: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (removingColor || isSubmitting) return

        setRemovingColor(colorToRemove)
        try {
            // We need the variant ID but only have the name — use name as a workaround
            // This component should ideally be updated to receive variant IDs
            toast.info("لحذف المتغيرات، استخدم صفحة تفاصيل المنتج")
        } catch {
            toast.error("خطأ غير متوقع")
        } finally {
            setRemovingColor(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedColor = newColor.trim()
        if (!trimmedColor) {
            toast.error("حقل مطلوب", { description: "يُرجى إدخال اسم المتغير قبل الحفظ" })
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addVariant(productId, {
                suffix: trimmedColor,
                name: trimmedColor,
                type: "color",
            })

            if (result.success) {
                toast.success("تم إضافة المتغير", { description: `تم إضافة "${trimmedColor}" للمنتج` })
                setNewColor("")
                setOpen(false)
                router.refresh()
            } else {
                toast.error("فشل إضافة المتغير", { description: result.error || "تعذّر حفظ المتغير" })
            }
        } catch {
            toast.error("خطأ غير متوقع", { description: "تعذّر الاتصال بالخادم" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                {trigger || (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-pink-100 hover:text-pink-700 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-pink-600" />
                        إضافة متغير سريع
                    </DialogTitle>
                    <DialogDescription>
                        أضف متغيرًا جديدًا لـ <span className="font-semibold text-foreground">{productName}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="colorName" className="text-sm font-medium">
                            اسم المتغير
                        </label>
                        <Input
                            id="colorName"
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            placeholder="مثال: أحمر، فضي، XL..."
                            className="h-11"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    {/* Current Variants */}
                    {currentColors && currentColors.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground font-medium">المتغيرات الحالية:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {currentColors.map((color, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className="px-2 py-0.5 text-xs bg-pink-50 text-pink-700 border-pink-200 gap-1"
                                    >
                                        <Palette className="h-2.5 w-2.5" />
                                        {color}
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
                            disabled={isSubmitting || !newColor.trim()}
                            className="rounded-xl bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
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
