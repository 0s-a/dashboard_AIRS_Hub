"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import {
    Loader2, Save, Play, Megaphone, Gauge, Clock, Timer,
    ChevronLeft, ChevronRight,
} from "lucide-react"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label }    from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn }       from "@/lib/utils"
import {
    createAnnouncement, updateAnnouncement,
    executeAnnouncementToQueue, previewAudience,
} from "@/lib/actions/announcements"
import { toast } from "sonner"
import { PersonTargetingPanel }  from "./person-targeting-panel"
import { ProductTargetingPanel } from "./product-targeting-panel"
import { TemplateSelector }      from "./template-selector"
import type { AnnouncementRow }  from "./announcement-columns"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnouncementSheetProps {
    open:         boolean
    onOpenChange: (open: boolean) => void
    announcement?: AnnouncementRow
    persons:      { id: string; name: string | null; groupName: string | null }[]

    products:     { id: string; name: string; itemNumber: string; categoryId: string | null }[]
    categories:   { id: string; name: string }[]
}

type PersonTarget  = { mode: "all" | "filter" | "manual" | "builder"; filters: any; manualIds: string[] }
type ProductTarget = { mode: "all" | "filter" | "manual"; filters: any; manualIds: string[] }

// ─── Throttle Presets ─────────────────────────────────────────────────────────

const RATE_OPTIONS = [
    { label: "بلا حد", value: 0  },
    { label: "10/د",   value: 10 },
    { label: "30/د",   value: 30 },
    { label: "60/د",   value: 60 },
    { label: "120/د",  value: 120},
]

const DELAY_OPTIONS = [
    { label: "فوري",  value: 0  },
    { label: "2 ث",   value: 2  },
    { label: "5 ث",   value: 5  },
    { label: "10 ث",  value: 10 },
    { label: "30 ث",  value: 30 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalDatetime = (d: Date | string) => {
    const date   = new Date(d)
    const offset = date.getTimezoneOffset()
    const local  = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
}

function SegmentedControl<T extends string | number>({
    options, value, onChange, className,
}: {
    options:   { label: string; value: T }[]
    value:     T
    onChange:  (v: T) => void
    className?: string
}) {
    return (
        <div className={cn("flex rounded-xl border border-border/60 overflow-hidden bg-muted/30 p-0.5 gap-0.5", className)}>
            {options.map(opt => (
                <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all duration-200",
                        value === opt.value
                            ? "bg-background shadow text-primary border border-primary/20"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementSheet({
    open, onOpenChange, announcement,
    persons, products, categories,
}: AnnouncementSheetProps) {
    const isEditing = !!announcement
    const [isLoading,     setIsLoading]     = useState(false)
    const [personTarget,  setPersonTarget]  = useState<PersonTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [productTarget, setProductTarget] = useState<ProductTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [preview,       setPreview]       = useState<{ personCount: number; productCount: number } | null>(null)
    const [templateId,    setTemplateId]    = useState<string | null>(null)

    // ── Throttle state ────────────────────────────────────────────────────────
    const [messagesPerMinute,   setMessagesPerMinute]   = useState(0)
    const [delayBetweenSeconds, setDelayBetweenSeconds] = useState(0)
    const [useTimeWindow,       setUseTimeWindow]       = useState(false)
    const [sendWindowStart,     setSendWindowStart]     = useState("09:00")
    const [sendWindowEnd,       setSendWindowEnd]       = useState("18:00")

    const { register, handleSubmit, reset, formState: { errors } } = useForm<{
        title: string; description: string; scheduledAt: string
    }>()

    // Reset form on open
    useEffect(() => {
        if (!open) return
        if (announcement) {
            const ann = announcement as any
            const pf  = ann.personFilters  as any
            const rf  = ann.productFilters as any
            const pIds = (pf?.manualIds as string[]) || []
            const rIds = (rf?.manualIds as string[]) || []
            reset({
                title:       ann.title,
                description: ann.description || "",
                scheduledAt: toLocalDatetime(ann.scheduledAt),
            })
            setPersonTarget({
                mode: pf?.all ? "all" : pIds.length > 0 ? "manual" : "filter",
                filters: pf || {}, manualIds: pIds,
            })
            setProductTarget({
                mode: rf?.all ? "all" : rIds.length > 0 ? "manual" : "filter",
                filters: rf || {}, manualIds: rIds,
            })
            // Restore throttle
            setDelayBetweenSeconds(ann.delayBetweenSeconds ?? 0)
            setSendWindowStart(ann.sendWindowStart ?? "09:00")
            setSendWindowEnd(ann.sendWindowEnd     ?? "18:00")
            setUseTimeWindow(!!(ann.sendWindowStart || ann.sendWindowEnd))
            setTemplateId((ann as any).templateId ?? null)
        } else {
            reset({ title: "", description: "", scheduledAt: toLocalDatetime(new Date()) })
            setPersonTarget({ mode: "all", filters: { all: true }, manualIds: [] })
            setProductTarget({ mode: "all", filters: { all: true }, manualIds: [] })
            setMessagesPerMinute(0)
            setDelayBetweenSeconds(0)
            setSendWindowStart("09:00")
            setSendWindowEnd("18:00")
            setUseTimeWindow(false)
            setTemplateId(null)
        }
    }, [open, announcement, reset])

    // Live preview
    useEffect(() => {
        const pFilters = personTarget.mode  === "all" ? { all: true } : personTarget.mode  === "filter" ? personTarget.filters  : { manualIds: personTarget.manualIds }
        const rFilters = productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : { manualIds: productTarget.manualIds }
        previewAudience(pFilters, rFilters)
            .then(res => { if (res.success && res.data) setPreview(res.data as any) })
    }, [personTarget, productTarget])

    const buildPayload = (data: { title: string; description: string; scheduledAt: string }) => {
        const pFilters = personTarget.mode  === "all" ? { all: true } : personTarget.mode  === "filter" ? personTarget.filters  : { manualIds: personTarget.manualIds }
        const rFilters = productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : { manualIds: productTarget.manualIds }
        return {
            title:               data.title,
            description:         data.description,
            scheduledAt:         new Date(data.scheduledAt).toISOString(),
            personFilters:       pFilters,
            productFilters:      rFilters,
            templateId,
            delayBetweenSeconds,
            sendWindowStart: useTimeWindow ? sendWindowStart : null,
            sendWindowEnd:   useTimeWindow ? sendWindowEnd   : null,
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
            else toast.error((res as any).error)
        } finally { setIsLoading(false) }
    }

    const onExecute = async (data: { title: string; description: string; scheduledAt: string }) => {
        setIsLoading(true)
        try {
            const payload = buildPayload(data)
            let annId = announcement?.id
            if (!annId) {
                const res = await createAnnouncement(payload)
                if (!res.success) { toast.error((res as any).error); setIsLoading(false); return }
                annId = (res.data as any).id
            } else {
                await updateAnnouncement(annId, payload)
            }
            const toastId = toast.loading("جاري النشر على RabbitMQ...")
            const execRes = await executeAnnouncementToQueue(annId!)
            toast.dismiss(toastId)
            if (execRes.success) {
                const d = execRes.data as any
                toast.success(`✅ تم وضع ${d?.totalMessages ?? 0} رسالة في الطابور`)
                window.dispatchEvent(new Event("refresh-announcements"))
                onOpenChange(false)
            } else {
                toast.error((execRes as any).error)
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

                    {/* ── Basic Info ── */}
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
                            <input type="datetime-local"
                                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                {...register("scheduledAt", { required: "التاريخ مطلوب" })}
                            />
                            {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>}
                        </div>
                    </div>

                    <Separator />

                    {/* ── Persons Targeting ── */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-primary inline-block" />
                            الأشخاص المستهدفون
                        </h3>
                        <PersonTargetingPanel
                            value={personTarget} onChange={setPersonTarget}
                            persons={persons}
                            previewCount={preview?.personCount}
                        />
                    </div>

                    <Separator />

                    {/* ── Products Targeting ── */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-indigo-500 inline-block" />
                            المنتجات المشمولة
                        </h3>
                        <ProductTargetingPanel
                            value={productTarget} onChange={setProductTarget}
                            products={products} categories={categories}
                            previewCount={preview?.productCount}
                        />
                    </div>

                    <Separator />

                    {/* ── Message Template ── */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                            قالب الرسالة
                        </h3>
                        <TemplateSelector
                            selectedId={templateId}
                            onSelect={setTemplateId}
                        />
                    </div>

                    <Separator />

                    {/* ── Throttle / Send Settings ── */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Gauge className="size-3.5" />
                            إعدادات الإرسال
                        </h3>

                        {/* Rate */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-1.5">
                                <Timer className="size-3.5 text-muted-foreground" />
                                معدل الإرسال
                                <span className="text-[11px] font-normal text-muted-foreground mr-auto">
                                    {messagesPerMinute === 0 ? "بلا حد" : `${messagesPerMinute} رسالة / دقيقة`}
                                </span>
                            </Label>
                            <SegmentedControl
                                options={RATE_OPTIONS}
                                value={messagesPerMinute}
                                onChange={setMessagesPerMinute}
                            />
                        </div>

                        {/* Delay */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-1.5">
                                <Clock className="size-3.5 text-muted-foreground" />
                                التأخير بين الرسائل
                                <span className="text-[11px] font-normal text-muted-foreground mr-auto">
                                    {delayBetweenSeconds === 0 ? "فوري" : `${delayBetweenSeconds} ثانية`}
                                </span>
                            </Label>
                            <SegmentedControl
                                options={DELAY_OPTIONS}
                                value={delayBetweenSeconds}
                                onChange={setDelayBetweenSeconds}
                            />
                        </div>

                        {/* Time Window toggle */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setUseTimeWindow(v => !v)}
                                className={cn(
                                    "w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                                    useTimeWindow
                                        ? "border-primary/30 bg-primary/5 text-primary"
                                        : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <Clock className="size-3.5" />
                                    نافذة الإرسال اليومية
                                </span>
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-bold transition-colors",
                                    useTimeWindow ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    {useTimeWindow ? "مفعّلة" : "معطّلة"}
                                </span>
                            </button>

                            {useTimeWindow && (
                                <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3.5 border border-border/40">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">من</Label>
                                        <input
                                            type="time"
                                            value={sendWindowStart}
                                            onChange={e => setSendWindowStart(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <ChevronLeft className="size-4 text-muted-foreground mt-4 shrink-0" />
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">إلى</Label>
                                        <input
                                            type="time"
                                            value={sendWindowEnd}
                                            onChange={e => setSendWindowEnd(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                            )}

                            {useTimeWindow && (
                                <p className="text-[11px] text-muted-foreground px-1">
                                    سيتوقف n8n عن إرسال الرسائل خارج هذا النطاق ويستأنف في اليوم التالي
                                </p>
                            )}
                        </div>

                        {/* Summary badge */}
                        {(messagesPerMinute > 0 || delayBetweenSeconds > 0 || useTimeWindow) && (
                            <div className="flex flex-wrap gap-2">
                                {messagesPerMinute > 0 && (
                                    <span className="text-[11px] font-bold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                                        ⚡ {messagesPerMinute} رسالة/دقيقة
                                    </span>
                                )}
                                {delayBetweenSeconds > 0 && (
                                    <span className="text-[11px] font-bold bg-indigo-500/10 text-indigo-600 rounded-full px-2.5 py-1">
                                        ⏱ {delayBetweenSeconds}ث بين كل رسالة
                                    </span>
                                )}
                                {useTimeWindow && (
                                    <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 rounded-full px-2.5 py-1">
                                        🕐 {sendWindowStart} — {sendWindowEnd}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* ── Action buttons ── */}
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
