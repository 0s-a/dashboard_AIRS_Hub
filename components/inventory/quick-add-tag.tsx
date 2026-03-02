"use client"

import { useState } from "react"
import { Hash, Plus, Loader2 } from "lucide-react"
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
import { addTagToProduct, removeTagFromProduct } from "@/lib/actions/inventory"

interface QuickAddTagProps {
    productId: string
    productName: string
    currentTags?: string[] | null
    trigger?: React.ReactNode
}

export function QuickAddTag({
    productId,
    productName,
    currentTags,
    trigger
}: QuickAddTagProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [newTag, setNewTag] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [removingTag, setRemovingTag] = useState<string | null>(null)

    const handleRemoveTag = async (e: React.MouseEvent, tagToRemove: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (removingTag || isSubmitting) return

        setRemovingTag(tagToRemove)
        try {
            const result = await removeTagFromProduct(productId, tagToRemove)
            if (result.success) {
                toast.success('تم إزالة الوسم', { description: `تم إزالة "#${tagToRemove}" من المنتج` })
                router.refresh()
            } else {
                toast.error('فشل إزالة الوسم', { description: result.error || 'تعذّر إزالة الوسم' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى المحاولة مجدداً' })
        } finally {
            setRemovingTag(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedTag = newTag.trim()
        if (!trimmedTag) {
            toast.error('حقل مطلوب', { description: 'يُرجى إدخال الوسم قبل الحفظ' })
            return
        }

        setIsSubmitting(true)
        try {
            const result = await addTagToProduct(productId, trimmedTag)

            if (result.success) {
                toast.success('تم إضافة الوسم', { description: `تم إضافة "#${trimmedTag}" للمنتج` })
                setNewTag("")
                setOpen(false)
                router.refresh()
            } else {
                toast.error('فشل إضافة الوسم', { description: result.error || 'تعذّر حفظ الوسم، يُرجى المحاولة مجدداً' })
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
                        className="h-5 w-5 rounded-full hover:bg-violet-100 hover:text-violet-700 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-violet-600" />
                        إضافة وسم سريع
                    </DialogTitle>
                    <DialogDescription>
                        أضف وسم جديد لـ <span className="font-semibold text-foreground">{productName}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="tagName" className="text-sm font-medium">
                            الوسم
                        </label>
                        <Input
                            id="tagName"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="مثال: عرض خاص، جديد، مميز..."
                            className="h-11"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    {/* Current Tags */}
                    {currentTags && currentTags.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground font-medium">الوسوم الحالية:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {currentTags.map((tag, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className={`px-2 py-0.5 text-xs bg-violet-50 text-violet-700 border-violet-200 gap-1 transition-all ${removingTag === tag ? 'opacity-50 pointer-events-none' : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer'}`}
                                        onClick={(e) => handleRemoveTag(e, tag)}
                                        title="انقر للإزالة"
                                    >
                                        {removingTag === tag ? (
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                        ) : (
                                            <Hash className="h-2.5 w-2.5" />
                                        )}
                                        {tag}
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
                            disabled={isSubmitting || !newTag.trim()}
                            className="rounded-xl bg-linear-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
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
