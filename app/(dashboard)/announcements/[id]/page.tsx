"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import {
    ArrowRight, Loader2, Save, CalendarClock,
    Users, Package, CheckCircle2, Layers,
    SlidersHorizontal, Zap, Sparkles, Clock,
    FileText, ImageIcon, Send, History, BarChart2,
    Gauge, Timer, Sun, AlertTriangle, Copy,
} from "lucide-react"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Textarea }  from "@/components/ui/textarea"
import { Label }     from "@/components/ui/label"
import { Badge }     from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PersonTargetingPanel }  from "@/components/announcements/person-targeting-panel"
import { ProductTargetingPanel } from "@/components/announcements/product-targeting-panel"
import { DeliveryProgressPanel } from "@/components/announcements/delivery-progress-panel"
import { LaunchConfirmDialog }   from "@/components/announcements/launch-confirm-dialog"
import { TemplateSelector }      from "@/components/announcements/template-selector"
import { DryRunDialog }              from "@/components/announcements/dry-run-dialog"
import { AudienceSnapshotDialog }    from "@/components/announcements/audience-snapshot-dialog"
import {
    getAnnouncement,
    updateAnnouncement,
    executeAnnouncementToQueue,
    previewAudience,
} from "@/lib/actions/announcements"
import type { PersonFilters, ProductFilters } from "@/lib/types/announcements"
import { getAnnouncementSheetData } from "@/lib/actions/announcement-sheet-data"
import { THROTTLE_PRESETS, calculateEta } from "@/lib/utils/throttle-presets"
import { toast }  from "sonner"
import { cn }     from "@/lib/utils"
import type { AnnouncementRow } from "@/components/announcements/announcement-columns"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDatetime(d: Date | string) {
    const date   = new Date(d)
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

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; dot?: string }> = {
    pending:   { label: "مسودة",           color: "bg-muted text-muted-foreground border-0" },
    queueing:  { label: "جاري النشر...",   color: "bg-primary/10 text-primary border-0",          dot: "bg-primary"     },
    queued:    { label: "في الطابور",       color: "bg-indigo-500/10 text-indigo-600 border-0",    dot: "bg-indigo-500"  },
    sent:      { label: "تم الإرسال",      color: "bg-emerald-500/10 text-emerald-600 border-0",  dot: "bg-emerald-500" },
    cancelled: { label: "ملغى",            color: "bg-muted text-muted-foreground border-0" },
    failed:    { label: "فشل",             color: "bg-destructive/10 text-destructive border-0" },
}

type PersonTarget  = { mode: "all"|"filter"|"manual"|"builder"; filters: PersonFilters;  manualIds: string[] }
type ProductTarget = { mode: "all"|"filter"|"manual"; filters: ProductFilters; manualIds: string[] }

// ─── Tab Definition ───────────────────────────────────────────────────────────

const TAB_IDS = ["info", "audience", "template", "settings"] as const
type TabId = typeof TAB_IDS[number]

const TABS: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: "info",     label: "المعلومات",  icon: FileText         },
    { id: "audience", label: "الجمهور",    icon: Users            },
    { id: "template", label: "القالب",     icon: Sparkles         },
    { id: "settings", label: "الإرسال",   icon: SlidersHorizontal },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementDetailPage() {
    const { id }  = useParams<{ id: string }>()
    const router  = useRouter()

    const [ann, setAnn] = useState<(AnnouncementRow & {
        queueingProgress?: number
    }) | null>(null)
    const [sheetData,     setSheetData]     = useState<any>({ persons: [], personTypes: [], products: [], categories: [] })
    const [personTarget,  setPersonTarget]  = useState<PersonTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [productTarget, setProductTarget] = useState<ProductTarget>({ mode: "all", filters: { all: true }, manualIds: [] })
    const [preview,       setPreview]       = useState<{ personCount: number; productCount: number } | null>(null)
    const [saving,           setSaving]           = useState(false)
    const [launching,         setLaunching]         = useState(false)
    const [confirmOpen,       setConfirmOpen]       = useState(false)
    const [messagesPerMinute, setMessagesPerMinute] = useState(0)
    const [delaySeconds,      setDelaySeconds]      = useState(0)
    const [sendWindowStart,   setSendWindowStart]   = useState<string>("09:00")
    const [sendWindowEnd,     setSendWindowEnd]     = useState<string>("22:00")
    const [windowEnabled,     setWindowEnabled]     = useState(false)
    const [templateId,        setTemplateId]        = useState<string | null>(null)
    const [activeTab,         setActiveTab]         = useState<TabId>("info")

    const { register, handleSubmit, reset, formState: { errors } } = useForm<{
        title: string; description: string; scheduledAt: string
    }>()

    // ── Load ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([getAnnouncement(id), getAnnouncementSheetData()]).then(([annRes, sdRes]) => {
            if (!annRes.success || !annRes.data) { router.push("/announcements"); return }
            const a = annRes.data as any
            setAnn(a)
            setMessagesPerMinute(0) // no longer stored — kept for UI only
            setDelaySeconds(a.delayBetweenSeconds ?? 0)
            if (a.sendWindowStart) { setSendWindowStart(a.sendWindowStart); setWindowEnabled(true) }
            if (a.sendWindowEnd)   { setSendWindowEnd(a.sendWindowEnd);     setWindowEnabled(true) }
            setTemplateId(a.templateId ?? null)
            reset({ title: a.title, description: a.description || "", scheduledAt: toLocalDatetime(a.scheduledAt) })

            const pf   = a.personFilters  as any
            const rf   = a.productFilters as any
            const pIds = (pf?.manualIds as string[]) || []
            const rIds = (rf?.manualIds as string[]) || []

            setPersonTarget({
                mode:      pf?.all ? "all" : pIds.length > 0 ? "manual" : pf?.filterGroups ? "builder" : Object.keys(pf || {}).length > 0 ? "filter" : "all",
                filters:   pf || {},
                manualIds: pIds,
            })
            setProductTarget({
                mode:      rf?.all ? "all" : rIds.length > 0 ? "manual" : Object.keys(rf || {}).length > 0 ? "filter" : "all",
                filters:   rf || {},
                manualIds: rIds,
            })
            if (sdRes.success && sdRes.data) setSheetData(sdRes.data)
        })
    }, [id, reset, router])

    // ── Live preview ──────────────────────────────────────────────────────────
    useEffect(() => {
        const pf = personTarget.mode  === "all" ? { all: true } : personTarget.mode  === "filter" ? personTarget.filters  : { manualIds: personTarget.manualIds }
        const rf = productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : { manualIds: productTarget.manualIds }
        previewAudience(pf, rf)
            .then(res => { if (res.success && res.data) setPreview(res.data as any) })
    }, [personTarget, productTarget])


    const buildPayload = (data: { title: string; description: string; scheduledAt: string }) => {
        const personFilters =
            personTarget.mode === "all"     ? { all: true } :
            personTarget.mode === "filter"  ? personTarget.filters :
            personTarget.mode === "builder" ? personTarget.filters : // contains filterGroups
            {}

        return {
            title:               data.title,
            description:         data.description,
            scheduledAt:         new Date(data.scheduledAt).toISOString(),
            personFilters,
            productFilters:      productTarget.mode === "all" ? { all: true } : productTarget.mode === "filter" ? productTarget.filters : { manualIds: productTarget.manualIds },
            templateId,
            delayBetweenSeconds: delaySeconds,
            sendWindowStart:     windowEnabled ? sendWindowStart : null,
            sendWindowEnd:       windowEnabled ? sendWindowEnd   : null,
        }
    }


    const onSave = async (data: { title: string; description: string; scheduledAt: string }) => {
        setSaving(true)
        const res = await updateAnnouncement(id, buildPayload(data))
        if (res.success) toast.success("تم حفظ التغييرات ✓")
        else             toast.error((res as any).error)
        setSaving(false)
    }

    // Opens the confirmation dialog (validates audience first)
    const onLaunch = (data: { title: string; description: string; scheduledAt: string }) => {
        if ((preview?.personCount ?? 0) === 0) {
            toast.error("لا يوجد أشخاص في الجمهور المحدد")
            return
        }
        // Store latest form data for when the dialog confirms
        ;(window as any).__launchFormData = data
        setConfirmOpen(true)
    }

    // Called by LaunchConfirmDialog after user confirms
    const doLaunch = async () => {
        const data = (window as any).__launchFormData ?? {}
        setConfirmOpen(false)
        setLaunching(true)
        await updateAnnouncement(id, buildPayload(data))
        const res = await executeAnnouncementToQueue(id)
        if (res.success && res.data) {
            const d = res.data as any
            toast.success(`✅ تم وضع ${d.totalMessages ?? 0} رسالة في الطابور`)
            // ── Auto-transition: update local state so DeliveryProgressPanel shows ──
            setAnn(prev => prev ? {
                ...prev,
                status: 'queued',
            } as any : prev)
        } else {
            toast.error((res as any).error)
        }
        setLaunching(false)
    }

    if (!ann) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    const status    = ann.status as string
    const statusCfg = STATUS_MAP[status] ?? STATUS_MAP.pending
    const isActive  = ["queueing", "queued"].includes(status)
    const isDone    = status === "sent"
    const isDraft   = ["pending", "cancelled", "failed"].includes(status)

    const expectedBatches = preview ? preview.personCount : 0
    const eta = preview ? calculateEta(preview.personCount, {
        messagesPerMinute,
        delayBetweenSeconds: delaySeconds,
        sendWindowStart: windowEnabled ? sendWindowStart : null,
        sendWindowEnd:   windowEnabled ? sendWindowEnd   : null,
    }) : null

    // ── Tab visibility ────────────────────────────────────────────────────────
    // Hide settings tab when active/done
    const visibleTabs = TABS.filter(t => {
        if (t.id === "settings") return isDraft
        return true
    })

    return (
        <div className="max-w-3xl mx-auto space-y-0 pb-24">

            {/* ── Header ── */}
            <div className="flex items-start gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/announcements")}
                    className="size-9 rounded-xl shrink-0 mt-0.5">
                    <ArrowRight className="size-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black truncate">{ann.title}</h1>
                        <div className="flex items-center gap-1.5">
                            {statusCfg.dot && (
                                <span className={cn("size-2 rounded-full", statusCfg.dot, isActive && "animate-pulse")} />
                            )}
                            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                        </div>
                    </div>

                    {/* Summary strip */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <CalendarClock className="size-3.5" />
                            {formatDate(ann.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="size-3.5 text-primary" />
                            <span className="text-primary font-semibold">{preview?.personCount ?? "—"}</span> شخص
                        </span>
                        <span className="flex items-center gap-1">
                            <Package className="size-3.5 text-indigo-500" />
                            <span className="text-indigo-500 font-semibold">{preview?.productCount ?? "—"}</span> منتج
                        </span>
                        {isDone && ann.sentAt && (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <Send className="size-3.5" />
                                تم الإرسال · {formatDate(ann.sentAt)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Monitoring Panel (active or done) ── */}
            {(isActive || isDone) && (
                <div className="glass-panel rounded-2xl border border-border/50 p-6 space-y-2 mb-5">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Layers className="size-3.5" /> تقدم الإرسال
                    </h2>
                    <DeliveryProgressPanel
                        announcementId={id}
                        initialStatus={status}
                        initialSentCount={0}
                        totalBatches={0}
                        onComplete={() => router.push("/announcements")}
                        onCancel={() => router.push("/announcements")}
                        messagesPerMinute={0}
                        delayBetweenSeconds={(ann as any).delayBetweenSeconds ?? 0}
                        sendWindowStart={(ann as any).sendWindowStart ?? null}
                        sendWindowEnd={(ann as any).sendWindowEnd ?? null}
                    />
                </div>
            )}

            {/* ── Done: Success Banner + Quick Links ── */}
            {isDone && (
                <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                        <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-black text-emerald-700">تم إرسال هذا الإعلان بنجاح</p>
                            <p className="text-xs text-emerald-600">تم الإرسال · {formatDate(ann.sentAt ?? null)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm"
                            onClick={() => router.push(`/announcements/${id}/logs`)}
                            className="flex-1 rounded-xl h-9 gap-2 font-semibold">
                            <History className="size-3.5" />
                            سجل الإرسال
                        </Button>
                        <Button variant="outline" size="sm"
                            onClick={() => router.push(`/announcements/${id}/analytics`)}
                            className="flex-1 rounded-xl h-9 gap-2 font-semibold">
                            <BarChart2 className="size-3.5" />
                            تحليل الأداء
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Tabs Navigation ── */}
            {isDraft && (
                <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex border-b border-border/50 bg-muted/20">
                        {visibleTabs.map(tab => {
                            const Icon = tab.icon
                            const active = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold transition-all duration-200 border-b-2",
                                        active
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Tab content */}
                    <div className="p-6">

                        {/* ── Tab: المعلومات ── */}
                        {activeTab === "info" && (
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-semibold">العنوان</Label>
                                    <Input className="h-11 rounded-xl"
                                        {...register("title", { required: "مطلوب" })} />
                                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-semibold">الوصف</Label>
                                    <Textarea className="rounded-xl resize-none min-h-20"
                                        placeholder="وصف اختياري..." {...register("description")} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                                        <CalendarClock className="size-3.5 text-muted-foreground" /> التاريخ والوقت
                                    </Label>
                                    <input type="datetime-local"
                                        className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                        {...register("scheduledAt")} />
                                </div>
                            </div>
                        )}

                        {/* ── Tab: الجمهور ── */}
                        {activeTab === "audience" && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-primary inline-block" /> الأشخاص المستهدفون
                                        </h3>
                                        <span className={cn("text-xs font-black", (preview?.personCount ?? 0) > 0 ? "text-primary" : "text-muted-foreground")}>
                                            {preview?.personCount ?? "—"} شخص
                                        </span>
                                    </div>
                                    <PersonTargetingPanel value={personTarget} onChange={setPersonTarget}
                                        persons={sheetData.persons} personTypes={sheetData.personTypes}
                                        personTags={sheetData.personTags ?? []}
                                        previewCount={preview?.personCount} />

                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-indigo-500 inline-block" /> المنتجات المشمولة
                                        </h3>
                                        <span className={cn("text-xs font-black", (preview?.productCount ?? 0) > 0 ? "text-indigo-500" : "text-muted-foreground")}>
                                            {preview?.productCount ?? "—"} منتج
                                        </span>
                                    </div>
                                    <ProductTargetingPanel value={productTarget} onChange={setProductTarget}
                                        products={sheetData.products} categories={sheetData.categories}
                                        previewCount={preview?.productCount} />
                                </div>
                            </div>
                        )}

                        {/* ── Tab: القالب ── */}
                        {activeTab === "template" && (
                            <TemplateSelector
                                selectedId={templateId}
                                onSelect={setTemplateId}
                            />
                        )}

                        {/* ── Tab: الإرسال ── */}
                        {activeTab === "settings" && (
                            <div className="space-y-5">

                                {/* ── Throttle Presets ── */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <Zap className="size-3.5 text-primary" /> إعدادات مسبقة
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {THROTTLE_PRESETS.map(p => {
                                            const active =
                                                messagesPerMinute === p.messagesPerMinute &&
                                                delaySeconds === p.delayBetweenSeconds
                                            return (
                                                <button key={p.key} type="button"
                                                    onClick={() => {
                                                        setMessagesPerMinute(p.messagesPerMinute)
                                                        setDelaySeconds(p.delayBetweenSeconds)
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-200",
                                                        active
                                                            ? "border-primary/50 bg-primary/8 shadow-sm"
                                                            : "border-border/50 hover:border-border hover:bg-muted/30"
                                                    )}>
                                                    <span className="text-xl">{p.emoji}</span>
                                                    <span className={cn("text-xs font-black", active && "text-primary")}>{p.label}</span>
                                                    <span className="text-[10px] text-muted-foreground leading-tight">{p.description}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <Separator />

                                {/* ── Rate + Delay ── */}
                                <div className="grid grid-cols-2 gap-5">

                                    {/* Rate Limiter */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                                            <Gauge className="size-3.5 text-primary" />
                                            معدل الإرسال
                                        </Label>
                                        <div className="space-y-2">
                                            <input type="range" min={0} max={120} step={5}
                                                value={messagesPerMinute}
                                                onChange={e => setMessagesPerMinute(Number(e.target.value))}
                                                className="w-full accent-primary" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-muted-foreground">بلا حد</span>
                                                <div className="text-center">
                                                    {messagesPerMinute === 0
                                                        ? <span className="text-sm font-black text-emerald-600">∞ بلا حد</span>
                                                        : <span className="text-sm font-black text-primary">{messagesPerMinute} / دقيقة</span>
                                                    }
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">120</span>
                                            </div>
                                        </div>
                                        {/* Quick picks */}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[0, 10, 30, 60].map(v => (
                                                <button key={v} type="button"
                                                    onClick={() => setMessagesPerMinute(v)}
                                                    className={cn(
                                                        "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all",
                                                        messagesPerMinute === v
                                                            ? "bg-primary text-white border-transparent"
                                                            : "border-border/50 hover:border-primary/40"
                                                    )}>
                                                    {v === 0 ? "∞" : v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Delay between messages */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                                            <Timer className="size-3.5 text-indigo-500" />
                                            تأخير بين الرسائل
                                        </Label>
                                        <div className="space-y-2">
                                            <input type="range" min={0} max={60} step={1}
                                                value={delaySeconds}
                                                onChange={e => setDelaySeconds(Number(e.target.value))}
                                                className="w-full accent-indigo-500" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-muted-foreground">0ث</span>
                                                <div className="text-center">
                                                    {delaySeconds === 0
                                                        ? <span className="text-sm font-black text-emerald-600">بلا تأخير</span>
                                                        : <span className="text-sm font-black text-indigo-500">{delaySeconds} ثانية</span>
                                                    }
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">60ث</span>
                                            </div>
                                        </div>
                                        {/* Quick picks */}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[0, 2, 5, 10, 30].map(v => (
                                                <button key={v} type="button"
                                                    onClick={() => setDelaySeconds(v)}
                                                    className={cn(
                                                        "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all",
                                                        delaySeconds === v
                                                            ? "bg-indigo-500 text-white border-transparent"
                                                            : "border-border/50 hover:border-indigo-300"
                                                    )}>
                                                    {v === 0 ? "0ث" : `${v}ث`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Send Window ── */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                                            <Sun className="size-3.5 text-orange-500" /> نافذة الإرسال
                                            <span className="text-xs font-normal text-muted-foreground mr-1">(إرسال فقط في هذا التوقيت)</span>
                                        </Label>
                                        <button type="button"
                                            onClick={() => setWindowEnabled(v => !v)}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0",
                                                windowEnabled ? "bg-orange-500" : "bg-muted"
                                            )}>
                                            <span className={cn(
                                                "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                                                windowEnabled ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </div>
                                    {windowEnabled && (
                                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[10px] text-muted-foreground">من</p>
                                                <input type="time" value={sendWindowStart}
                                                    onChange={e => setSendWindowStart(e.target.value)}
                                                    className="w-full h-9 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm font-bold focus:outline-none focus:border-primary/50" />
                                            </div>
                                            <div className="text-muted-foreground text-lg font-black mt-5">←</div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[10px] text-muted-foreground">إلى</p>
                                                <input type="time" value={sendWindowEnd}
                                                    onChange={e => setSendWindowEnd(e.target.value)}
                                                    className="w-full h-9 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm font-bold focus:outline-none focus:border-primary/50" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── ETA Card ── */}
                                {preview && preview.personCount > 0 && (
                                    <div className={cn(
                                        "rounded-2xl border p-4 space-y-3 transition-colors",
                                        eta?.exceedsWindow
                                            ? "border-orange-500/30 bg-orange-500/5"
                                            : "border-primary/15 bg-primary/5"
                                    )}>

                                        {/* Warning */}
                                        {eta?.exceedsWindow && (
                                            <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2">
                                                <AlertTriangle className="size-3.5 text-orange-500 shrink-0 mt-0.5" />
                                                <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold">
                                                    وقت الانتهاء المتوقع ({eta.formattedFinish}) يتجاوز نافذة الإرسال ({sendWindowEnd}) — قد لا تصل بعض الرسائل!
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                            <Clock className="size-3.5" /> تقدير وقت الإرسال
                                        </p>
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div className="bg-background/60 rounded-xl p-2.5">
                                                <p className="text-[10px] text-muted-foreground">الأشخاص</p>
                                                <p className="text-base font-black text-primary">{preview.personCount.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-background/60 rounded-xl p-2.5">
                                                <p className="text-[10px] text-muted-foreground">الدفعات</p>
                                                <p className="text-base font-black">{expectedBatches}</p>
                                            </div>
                                            <div className="bg-background/60 rounded-xl p-2.5">
                                                <p className="text-[10px] text-muted-foreground">المدة</p>
                                                <p className={cn("text-base font-black",
                                                    eta?.exceedsWindow ? "text-orange-500" : "text-emerald-600"
                                                )}>
                                                    {eta?.formattedDuration ?? "فوري"}
                                                </p>
                                            </div>
                                            <div className="bg-background/60 rounded-xl p-2.5">
                                                <p className="text-[10px] text-muted-foreground">ينتهي الساعة</p>
                                                <p className={cn("text-base font-black",
                                                    eta?.exceedsWindow ? "text-orange-500" : "text-foreground"
                                                )}>
                                                    {eta?.formattedFinish ?? "—"}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/70 text-center">
                                            {messagesPerMinute > 0 ? `${messagesPerMinute} رسالة/دقيقة` : "بلا حد ∞"}
                                            {delaySeconds > 0 && ` · ${delaySeconds}ث بين كل رسالة`}
                                            {" · "}{preview?.personCount?.toLocaleString("ar")} رسالة
                                        </p>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Campaign summary (active/done) ── */}
            {(isActive || isDone) && (
                <div className="glass-panel rounded-2xl border border-border/50 p-5 mt-4">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Layers className="size-3.5" /> ملخص الحملة
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-primary font-semibold">
                            <Users className="size-4" /> {preview?.personCount ?? "—"} رسالة
                        </span>
                        {preview?.productCount ? (
                            <span className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                                <Package className="size-4" /> {preview.productCount} منتج
                            </span>
                        ) : null}
                        {(ann as any).delayBetweenSeconds > 0 && (
                            <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                                <Timer className="size-3.5" /> {(ann as any).delayBetweenSeconds}ث تأخير
                            </span>
                        )}
                        {(ann as any).sendWindowStart && (ann as any).sendWindowEnd && (
                            <span className="flex items-center gap-1.5 text-orange-600 font-semibold">
                                <Sun className="size-3.5" /> {(ann as any).sendWindowStart} — {(ann as any).sendWindowEnd}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Sticky Footer (draft mode) ── */}
            {isDraft && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-t border-border/50 px-6 py-4">
                    <div className="max-w-3xl mx-auto flex gap-3">
                        <Button type="button" variant="outline" disabled={saving || launching}
                            onClick={handleSubmit(onSave)}
                            className="h-11 rounded-xl font-bold gap-2 px-5">
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            حفظ مسودة
                        </Button>
                        <AudienceSnapshotDialog
                            announcementId={id}
                            disabled={saving || launching || (preview?.personCount ?? 0) === 0}
                        />
                        <DryRunDialog
                            announcementId={id}
                            disabled={saving || launching || (preview?.personCount ?? 0) === 0}
                        />
                        <Button type="button"
                            disabled={saving || launching || (preview?.personCount ?? 0) === 0}
                            onClick={handleSubmit(onLaunch)}
                            className="flex-1 h-11 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                            {launching ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                            إطلاق الحملة
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Launch Confirmation Dialog ── */}
            <LaunchConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={doLaunch}
                summary={{
                    personCount:          preview?.personCount ?? 0,
                    productCount:         preview?.productCount ?? 0,
                    messagesPerMinute:    0,
                    delayBetweenSeconds:  delaySeconds,
                    sendWindowStart:      windowEnabled ? sendWindowStart : null,
                    sendWindowEnd:        windowEnabled ? sendWindowEnd   : null,
                    formattedDuration:    eta?.formattedDuration ?? null,
                    formattedFinish:      eta?.formattedFinish   ?? null,
                    exceedsWindow:        eta?.exceedsWindow     ?? false,
                }}
            />
        </div>
    )
}
