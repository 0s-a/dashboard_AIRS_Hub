"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { Loader2, Save, Play, Megaphone } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createAnnouncement, updateAnnouncement, executeAnnouncement, previewAudience } from "@/lib/actions/announcements"
import { toast } from "sonner"
import { PersonTargetingPanel } from "./person-targeting-panel"
import { ProductTargetingPanel } from "./product-targeting-panel"
import type { AnnouncementRow } from "./announcement-columns"

interface AnnouncementSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    announcement?: AnnouncementRow
    persons: { id: string; name: string | null; groupName: string | null }[]
    personTypes: { id: string; name: string }[]
    products: { id: string; name: string; itemNumber: string; categoryId: string | null }[]
    categories: { id: string; name: string }[]
}

type PersonTarget = { mode: "all" | "filter" | "manual"; filters: any; manualIds: string[] }
type ProductTarget = { mode: "all" | "filter" | "manual"; filters: any; manualIds: string[] }

const toLocalDatetime = (d: Date | string) => {
    const date = new Date(d)
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
}

export function AnnouncementSheet({
    open, onOpenChange, announcement,
    persons, personTypes, products, categories,
}: AnnouncementSheetProps) {
    const isEditing = !!announcement
    const [isLoading, setIsLoading] = useState(false)
    const [personTarget, setPersonTarget] = useState<PersonTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [productTarget, setProductTarget] = useState<ProductTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [preview, setPreview] = useState<{ personCount: number; productCount: number } | null>(null)

    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ title: string; description: string; scheduledAt: string }>()

    useEffect(() => {
        if (!open) return
        if (announcement) {
            const pf = announcement.personFilters as any
            const rf = announcement.productFilters as any
            const pIds = announcement.personIds as string[] || []
            const rIds = announcement.productIds as string[] || []
            reset({
                title: announcement.title,
                description: announcement.description || "",
                scheduledAt: toLocalDatetime(announcement.scheduledAt),
            })
            setPersonTarget({
                mode: pf?.all ? "all" : pIds.length > 0 ? "manual" : "filter",
                filters: pf || {},
                manualIds: pIds,
            })
            setProductTarget({
                mode: rf?.all ? "all" : rIds.length > 0 ? "manual" : "filter",
                filters: rf || {},
                manualIds: rIds,
            })
        } else {
            reset({ title: "", description: "", scheduledAt: toLocalDatetime(new Date()) })
            setPersonTarget({ mode: "all", filters: { all: true }, manualIds: [] })
            setProductTarget({ mode: "all", filters: { all: true }, manualIds: [] })
        }
    }, [open, announcement, reset])

    // Live preview
    useEffect(() => {
        const pFilters = personTarget.mode === "all"
            ? { all: true }
            : personTarget.mode === "filter"
                ? personTarget.filters
                : {}
        const rFilters = productTarget.mode === "all"
            ? { all: true }
            : productTarget.mode === "filter"
                ? productTarget.filters
                : {}

        previewAudience(pFilters, personTarget.manualIds, rFilters, productTarget.manualIds)
            .then(res => { if (res.success && res.data) setPreview(res.data as any) })
    }, [personTarget, productTarget])

    const buildPayload = (data: { title: string; description: string; scheduledAt: string }) => {
        const pFilters = personTarget.mode === "all" ? { all: true } : personTarget.mode === "filter" ? personTarget.filters : {}
        const rFilters = productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : {}
        return {
            title: data.title,
            description: data.description,
            scheduledAt: new Date(data.scheduledAt).toISOString(),
            personIds: personTarget.manualIds,
            productIds: productTarget.manualIds,
            personFilters: pFilters,
            productFilters: rFilters,
        }
    }

    const onSave = async (data: { title: string; description: string; scheduledAt: string }) => {
        setIsLoading(true)
        try {
            const payload = buildPayload(data)
            const res = isEditing
                ? await updateAnnouncement(announcement!.id, payload)
                : await createAnnouncement(payload)
            if (res.success) { toast.success(isEditing ? "تم حفظ التغييرات" : "تم حفظ الإعلان كمسودة"); onOpenChange(false) }
            else toast.error(res.error)
        } finally { setIsLoading(false) }
    }

    const onExecute = async (data: { title: string; description: string; scheduledAt: string }) => {
        setIsLoading(true)
        try {
            const payload = buildPayload(data)
            let id = announcement?.id
            if (!id) {
                const res = await createAnnouncement(payload)
                if (!res.success) { toast.error(res.error); setIsLoading(false); return }
                id = (res.data as any).id
            } else {
                await updateAnnouncement(id, payload)
            }
            const toastId = toast.loading("جاري الإرسال...")
            const execRes = await executeAnnouncement(id!)
            toast.dismiss(toastId)
            if (execRes.success) {
                const d = execRes.data as any
                toast.success(`✅ تم إرسال الإعلان إلى ${d?.sentCount ?? 0} شخص`)
                window.dispatchEvent(new Event("refresh-announcements"))
                onOpenChange(false)
            } else {
                toast.error(execRes.error)
            }
        } finally { setIsLoading(false) }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        <Megaphone className="size-5 text-primary" />
                        {isEditing ? "تعديل الإعلان" : "إعلان جديد"}
                    </SheetTitle>
                    <SheetDescription>
                        {isEditing ? "عدّل تفاصيل الإعلان والجمهور المستهدف" : "أنشئ إعلاناً وحدّد الجمهور المستهدف"}
                    </SheetDescription>
                </SheetHeader>

                <form className="space-y-6 px-1">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">التفاصيل</h3>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">عنوان الإعلان <span className="text-destructive">*</span></Label>
                            <Input className="h-10 rounded-xl" placeholder="مثال: عروض رمضان خاصة"
                                {...register("title", { required: "العنوان مطلوب" })} />
                            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">الوصف (اختياري)</Label>
                            <Textarea className="rounded-xl resize-none min-h-20" placeholder="تفاصيل إضافية للإعلان..."
                                {...register("description")} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">التاريخ والوقت <span className="text-destructive">*</span></Label>
                            <input
                                type="datetime-local"
                                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                {...register("scheduledAt", { required: "التاريخ مطلوب" })}
                            />
                            {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>}
                        </div>
                    </div>

                    <Separator />

                    {/* Persons Targeting */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-primary inline-block" />
                            الأشخاص المستهدفون
                        </h3>
                        <PersonTargetingPanel
                            value={personTarget}
                            onChange={setPersonTarget}
                            persons={persons}
                            personTypes={personTypes}
                            previewCount={preview?.personCount}
                        />
                    </div>

                    <Separator />

                    {/* Products Targeting */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-indigo-500 inline-block" />
                            المنتجات المشمولة
                        </h3>
                        <ProductTargetingPanel
                            value={productTarget}
                            onChange={setProductTarget}
                            products={products}
                            categories={categories}
                            previewCount={preview?.productCount}
                        />
                    </div>

                    <Separator />

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" disabled={isLoading}
                            onClick={handleSubmit(onSave)}
                            className="flex-1 h-11 rounded-xl font-bold gap-2">
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            حفظ مسودة
                        </Button>
                        <Button type="button" disabled={isLoading}
                            onClick={handleSubmit(onExecute)}
                            className="flex-1 h-11 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                            تنفيذ الآن
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
