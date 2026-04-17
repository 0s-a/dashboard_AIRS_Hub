"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2, Megaphone, CalendarClock } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createAnnouncement } from "@/lib/actions/announcements"
import { toast } from "sonner"

interface QuickCreateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: (id: string) => void
}

interface FormValues {
    title: string
    description: string
    scheduledAt: string
}

function toLocalDatetime(d: Date) {
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
}

export function QuickCreateDialog({ open, onOpenChange, onCreated }: QuickCreateDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            title: "",
            description: "",
            scheduledAt: toLocalDatetime(new Date()),
        },
    })

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const res = await createAnnouncement({
                title:       data.title.trim(),
                description: data.description.trim() || undefined,
                scheduledAt: new Date(data.scheduledAt).toISOString(),
                personFilters:  { all: true },
                productFilters: { all: true },
            })
            if (res.success) {
                reset()
                onOpenChange(false)
                const id = (res.data as any).id
                toast.success("تم إنشاء الإعلان ✓ — يمكنك الآن تعديل تفاصيله")
                onCreated(id)
            } else {
                toast.error(res.error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Megaphone className="size-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">إعلان جديد</DialogTitle>
                            <DialogDescription className="text-xs">
                                أدخل المعلومات الأساسية — يمكنك تعديل الاستهداف لاحقاً
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">
                            عنوان الإعلان <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            className="h-10 rounded-xl"
                            placeholder="مثال: عروض رمضان الخاصة"
                            {...register("title", { required: "العنوان مطلوب" })}
                        />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">الوصف <span className="text-muted-foreground font-normal">(اختياري)</span></Label>
                        <Textarea
                            className="rounded-xl resize-none min-h-16 text-sm"
                            placeholder="تفاصيل مختصرة عن الإعلان..."
                            {...register("description")}
                        />
                    </div>

                    {/* Datetime */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <CalendarClock className="size-3.5 text-muted-foreground" />
                            التاريخ والوقت <span className="text-destructive">*</span>
                        </Label>
                        <input
                            type="datetime-local"
                            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            {...register("scheduledAt", { required: "التاريخ مطلوب" })}
                        />
                        {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>}
                    </div>

                    {/* Submit */}
                    <Button type="submit" disabled={isLoading} className="w-full h-10 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                        {isLoading
                            ? <><Loader2 className="size-4 animate-spin" /> جاري الإنشاء...</>
                            : <><Megaphone className="size-4" /> إنشاء الإعلان</>
                        }
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
