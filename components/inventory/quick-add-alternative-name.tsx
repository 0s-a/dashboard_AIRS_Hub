"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
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
import { addAlternativeNameToProduct } from "@/lib/actions/inventory"

interface QuickAddAlternativeNameProps {
    productId: string
    productName: string
    currentAlternativeNames?: string[] | null
    trigger?: React.ReactNode
}

export function QuickAddAlternativeName({
    productId,
    productName,
    currentAlternativeNames,
    trigger
}: QuickAddAlternativeNameProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedName = newName.trim()
        if (!trimmedName) {
            toast.error('حقل مطلوب', { description: 'يُرجى إدخال الاسم البديل قبل الحفظ' })
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addAlternativeNameToProduct(productId, trimmedName)

            if (result.success) {
                toast.success('تم إضافة الاسم البديل', { description: `تم إضافة "${trimmedName}" كاسم بديل للمنتج` })
                setNewName("")
                setOpen(false)
                router.refresh()
            } else {
                toast.error('فشل إضافة الاسم البديل', { description: result.error || 'تعذّر حفظ الاسم البديل، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى المحاولة مجدداً' })
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
                        className="h-5 w-5 rounded-full hover:bg-amber-100 hover:text-amber-700 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-amber-600" />
                        إضافة اسم بديل سريع
                    </DialogTitle>
                    <DialogDescription>
                        أضف اسم بديل جديد لـ <span className="font-semibold text-foreground">{productName}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="alternativeName" className="text-sm font-medium">
                            الاسم البديل
                        </label>
                        <Input
                            id="alternativeName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="مثال: iPhone 15 Pro Max"
                            className="h-11"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    {/* Current Alternative Names */}
                    {currentAlternativeNames && currentAlternativeNames.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground font-medium">الأسماء البديلة الحالية:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {currentAlternativeNames.map((name, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground hover:bg-muted cursor-default"
                                    >
                                        {name}
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
                            disabled={isSubmitting || !newName.trim()}
                            className="rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
