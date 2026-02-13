"use client"

import { useState } from "react"
import { Plus, Loader2, Palette } from "lucide-react"
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
import { addColorToProduct } from "@/lib/actions/inventory"

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
    const [colorName, setColorName] = useState("")
    const [colorCode, setColorCode] = useState("#000000")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedName = colorName.trim()
        if (!trimmedName) {
            toast.error("الرجاء إدخال اسم اللون")
            return
        }

        if (!colorCode) {
            toast.error("الرجاء اختيار كود اللون")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addColorToProduct(productId, {
                name: trimmedName,
                code: colorCode
            })

            if (result.success) {
                toast.success("تم إضافة اللون بنجاح")
                setColorName("")
                setColorCode("#000000")
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
                    <div className="space-y-2">
                        <Label htmlFor="colorName">اسم اللون</Label>
                        <Input
                            id="colorName"
                            value={colorName}
                            onChange={(e) => setColorName(e.target.value)}
                            placeholder="مثال: أحمر، أزرق، أخضر"
                            className="h-11"
                            disabled={isSubmitting}
                            autoFocus
                        />
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
                                        key={idx}
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
                            disabled={isSubmitting || !colorName.trim()}
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
