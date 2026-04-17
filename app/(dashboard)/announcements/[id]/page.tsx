"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import {
    ArrowRight, Loader2, Save, Megaphone, CalendarClock,
    Users, Package, CheckCircle2, XCircle, Clock, Layers,
    SlidersHorizontal, Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PersonTargetingPanel } from "@/components/announcements/person-targeting-panel"
import { ProductTargetingPanel } from "@/components/announcements/product-targeting-panel"
import { BatchExecutionPanel } from "@/components/announcements/batch-execution-panel"
import {
    getAnnouncement, updateAnnouncement,
    initBatchExecution, previewAudience,
    type PersonFilters, type ProductFilters, type BatchProgress,
} from "@/lib/actions/announcements"
import { getAnnouncementSheetData } from "@/lib/actions/announcement-sheet-data"
import { toast } from "sonner"
import type { AnnouncementRow } from "@/components/announcements/announcement-columns"

// ─── Helpers ─────────────────────────────────────────────────

function toLocalDatetime(d: Date | string) {
    const date = new Date(d)
    const offset = date.getTimezoneOffset()
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function formatDate(d: Date | string | null) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

const STATUS_MAP: Record<string, { label: string; color: string; dot?: string }> = {
    draft:     { label: "مسودة",         color: "bg-muted text-muted-foreground border-0" },
    running:   { label: "جاري الإرسال",  color: "bg-primary/10 text-primary border-0",         dot: "bg-primary" },
    paused:    { label: "متوقف مؤقتاً", color: "bg-amber-500/10 text-amber-600 border-0",      dot: "bg-amber-500" },
    sent:      { label: "تم الإرسال",   color: "bg-emerald-500/10 text-emerald-600 border-0",  dot: "bg-emerald-500" },
    cancelled: { label: "ملغى",          color: "bg-muted text-muted-foreground border-0" },
    failed:    { label: "فشل",           color: "bg-destructive/10 text-destructive border-0" },
}

type PersonTarget = { mode: "all"|"filter"|"manual"; filters: PersonFilters; manualIds: string[] }
type ProductTarget = { mode: "all"|"filter"|"manual"; filters: ProductFilters; manualIds: string[] }

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60]

// ─── Page ─────────────────────────────────────────────────────

export default function AnnouncementDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [ann, setAnn] = useState<(AnnouncementRow & { batchSize?: number; batchIntervalMinutes?: number; batchProgress?: any }) | null>(null)
    const [sheetData, setSheetData] = useState<any>({ persons: [], personTypes: [], products: [], categories: [] })
    const [personTarget, setPersonTarget] = useState<PersonTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [productTarget, setProductTarget] = useState<ProductTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [preview, setPreview] = useState<{ personCount: number; productCount: number } | null>(null)
    const [saving, setSaving] = useState(false)
    const [starting, setStarting] = useState(false)
    const [batchSize, setBatchSize] = useState(50)
    const [intervalMin, setIntervalMin] = useState(10)

    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ title: string; description: string; scheduledAt: string }>()

    // Load
    useEffect(() => {
        Promise.all([getAnnouncement(id), getAnnouncementSheetData()]).then(([annRes, sdRes]) => {
            if (!annRes.success || !annRes.data) { router.push("/announcements"); return }
            const a = annRes.data as any
            setAnn(a)
            setBatchSize(a.batchSize ?? 50)
            setIntervalMin(a.batchIntervalMinutes ?? 10)
            reset({ title: a.title, description: a.description || "", scheduledAt: toLocalDatetime(a.scheduledAt) })
            const pf = a.personFilters as any; const rf = a.productFilters as any
            const pIds = (a.personIds as string[]) || []; const rIds = (a.productIds as string[]) || []
            setPersonTarget({ mode: pf?.all ? "all" : pIds.length > 0 ? "manual" : Object.keys(pf||{}).length>0 ? "filter" : "all", filters: pf||{}, manualIds: pIds })
            setProductTarget({ mode: rf?.all ? "all" : rIds.length > 0 ? "manual" : Object.keys(rf||{}).length>0 ? "filter" : "all", filters: rf||{}, manualIds: rIds })
            if (sdRes.success && sdRes.data) setSheetData(sdRes.data)
        })
    }, [id, reset, router])

    // Live preview
    useEffect(() => {
        const pf = personTarget.mode === "all" ? { all: true } : personTarget.mode === "filter" ? personTarget.filters : {}
        const rf = productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : {}
        previewAudience(pf, personTarget.manualIds, rf, productTarget.manualIds)
            .then(res => { if (res.success && res.data) setPreview(res.data as any) })
    }, [personTarget, productTarget])

    const buildPayload = (data: { title: string; description: string; scheduledAt: string }) => ({
        title: data.title, description: data.description,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        personIds: personTarget.manualIds, productIds: productTarget.manualIds,
        personFilters: personTarget.mode === "all" ? { all: true } : personTarget.mode === "filter" ? personTarget.filters : {},
        productFilters: productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : {},
    })

    const onSave = async (data: { title: string; description: string; scheduledAt: string }) => {
        setSaving(true)
        const res = await updateAnnouncement(id, buildPayload(data))
        if (res.success) toast.success("تم حفظ التغييرات ✓")
        else toast.error((res as any).error)
        setSaving(false)
    }

    const onStartBatch = async (data: { title: string; description: string; scheduledAt: string }) => {
        if ((preview?.personCount ?? 0) === 0) { toast.error("لا يوجد أشخاص في الجمهور المحدد"); return }
        setStarting(true)
        await updateAnnouncement(id, buildPayload(data))
        const res = await initBatchExecution(id, batchSize, intervalMin)
        if (res.success && res.data) {
            const d = res.data as any
            toast.success(`✅ جاهز للإرسال — ${d.totalPersons} شخص على ${d.totalBatches} دُفعة`)
            // Immediately pull the fresh state so BatchExecutionPanel mounts and starts
            const fresh = await getAnnouncement(id)
            if (fresh.success && fresh.data) {
                setAnn(fresh.data as any)
            }
        } else {
            toast.error((res as any).error)
        }
        setStarting(false)
    }

    if (!ann) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="size-8 animate-spin text-primary" /></div>
    }

    const status = ann.status as string
    const statusCfg = STATUS_MAP[status] ?? STATUS_MAP.draft
    const isActive = status === "running" || status === "paused"
    const isDone   = status === "sent"
    const isDraft  = status === "draft" || status === "cancelled"
    const batchProgress = ann.batchProgress as unknown as BatchProgress
    const hasBatchProgress = batchProgress && typeof batchProgress === "object" && Object.keys(batchProgress).length > 0

    const expectedBatches = preview ? Math.ceil(preview.personCount / batchSize) : 0
    const expectedMinutes = expectedBatches > 1 ? (expectedBatches - 1) * intervalMin : 0

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-16">

            {/* Back + header */}
            <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/announcements")}
                    className="size-9 rounded-xl shrink-0 mt-0.5">
                    <ArrowRight className="size-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black">{ann.title}</h1>
                        <div className="flex items-center gap-1.5">
                            {statusCfg.dot && (
                                <span className={`size-2 rounded-full ${statusCfg.dot} ${status === "running" ? "animate-pulse" : ""}`} />
                            )}
                            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                        </div>
                    </div>
                    {ann.description && <p className="text-sm text-muted-foreground mt-1">{ann.description}</p>}
                </div>
            </div>

            {/* ─── Active: Batch execution panel ─── */}
            {(isActive || (isDone && hasBatchProgress)) && (
                <div className="glass-panel rounded-2xl border border-border/50 p-6 space-y-2">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Layers className="size-3.5" /> تقدم الإرسال
                    </h2>
                    {hasBatchProgress ? (
                        <BatchExecutionPanel
                            announcementId={id}
                            initialStatus={status}
                            initialProgress={batchProgress}
                            intervalMinutes={ann.batchIntervalMinutes ?? 10}
                            onComplete={() => router.push("/announcements")}
                            onCancel={() => { router.push("/announcements") }}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">جاري تحميل بيانات الإرسال...</p>
                    )}
                </div>
            )}

            {/* ─── Done: Summary banner ─── */}
            {isDone && !isActive && (
                <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-emerald-700">تم إرسال هذا الإعلان بنجاح</p>
                        <p className="text-xs text-emerald-600">أُرسل إلى {ann.sentCount} شخص · {formatDate(ann.sentAt)}</p>
                    </div>
                </div>
            )}

            <form className="space-y-5">
                {/* Basic info */}
                <div className="glass-panel rounded-2xl border border-border/50 p-6 space-y-5">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">المعلومات الأساسية</h2>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">العنوان</Label>
                        <Input className="h-11 rounded-xl" disabled={isDone || isActive}
                            {...register("title", { required: "مطلوب" })} />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">الوصف</Label>
                        <Textarea className="rounded-xl resize-none min-h-20" disabled={isDone || isActive}
                            placeholder="وصف اختياري..." {...register("description")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <CalendarClock className="size-3.5 text-muted-foreground" /> التاريخ والوقت
                        </Label>
                        <input type="datetime-local" disabled={isDone || isActive}
                            className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50"
                            {...register("scheduledAt")} />
                    </div>
                </div>

                {/* Persons targeting */}
                <div className="glass-panel rounded-2xl border border-border/50 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary inline-block" /> الأشخاص المستهدفون
                        </h2>
                        <span className={`text-xs font-black ${(preview?.personCount ?? 0) > 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {preview?.personCount ?? "—"} شخص
                        </span>
                    </div>
                    {!isDone && !isActive ? (
                        <PersonTargetingPanel value={personTarget} onChange={setPersonTarget}
                            persons={sheetData.persons} personTypes={sheetData.personTypes}
                            previewCount={preview?.personCount} />
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="size-4" /> {ann.sentCount ?? preview?.personCount ?? "—"} شخص
                        </div>
                    )}
                </div>

                {/* Products targeting */}
                <div className="glass-panel rounded-2xl border border-border/50 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="size-2 rounded-full bg-indigo-500 inline-block" /> المنتجات المشمولة
                        </h2>
                        <span className={`text-xs font-black ${(preview?.productCount ?? 0) > 0 ? "text-indigo-500" : "text-muted-foreground"}`}>
                            {preview?.productCount ?? "—"} منتج
                        </span>
                    </div>
                    {!isDone && !isActive ? (
                        <ProductTargetingPanel value={productTarget} onChange={setProductTarget}
                            products={sheetData.products} categories={sheetData.categories}
                            previewCount={preview?.productCount} />
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="size-4" /> منتجات مشمولة في الإعلان
                        </div>
                    )}
                </div>

                {/* ─── Batch Settings (only when draft/cancelled) ─── */}
                {isDraft && (
                    <div className="glass-panel rounded-2xl border border-border/50 p-6 space-y-5">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <SlidersHorizontal className="size-3.5" /> إعدادات الإرسال
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Batch size */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Users className="size-3.5 text-primary" /> أشخاص لكل دُفعة
                                </Label>
                                <div className="space-y-2">
                                    <input type="range" min={1} max={200} step={1} value={batchSize}
                                        onChange={e => setBatchSize(Number(e.target.value))}
                                        className="w-full accent-primary" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">1</span>
                                        <span className="text-lg font-black text-primary">{batchSize}</span>
                                        <span className="text-xs text-muted-foreground">200</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interval */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-indigo-500" /> الفترة بين الدُفعات
                                </Label>
                                <div className="grid grid-cols-3 gap-1.5 mt-2">
                                    {INTERVAL_OPTIONS.map(m => (
                                        <button key={m} type="button"
                                            onClick={() => setIntervalMin(m)}
                                            className={`text-xs font-bold rounded-lg py-1.5 border transition-all ${
                                                intervalMin === m
                                                    ? "bg-indigo-500 text-white border-transparent shadow-sm"
                                                    : "border-border/50 bg-muted/30 hover:border-indigo-300 hover:bg-indigo-500/5"
                                            }`}>
                                            {m} دق
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Estimated summary */}
                        {preview && preview.personCount > 0 && (
                            <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 border border-border/30">
                                <Layers className="size-4 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    سيتم الإرسال على{" "}
                                    <strong className="text-foreground">{expectedBatches} دُفعة</strong>
                                    {" · "}
                                    <strong className="text-foreground">{batchSize} شخص</strong> لكل دُفعة
                                    {" · كل "}
                                    <strong className="text-foreground">{intervalMin} دقيقة</strong>
                                    {expectedMinutes > 0 && (<>
                                        {" — التقدير: "}
                                        <strong className="text-primary">~{expectedMinutes} دقيقة</strong>
                                    </>)}
                                </p>
                            </div>
                        )}

                        <Separator />

                        {/* Action row */}
                        <div className="flex gap-3">
                            <Button type="button" variant="outline" disabled={saving || starting}
                                onClick={handleSubmit(onSave)}
                                className="flex-1 h-11 rounded-xl font-bold gap-2">
                                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                حفظ مسودة
                            </Button>
                            <Button type="button" disabled={saving || starting || (preview?.personCount ?? 0) === 0}
                                onClick={handleSubmit(onStartBatch)}
                                className="flex-1 h-11 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                                {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                                ابدأ الإرسال
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}
