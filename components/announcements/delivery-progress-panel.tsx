"use client"

/**
 * components/announcements/delivery-progress-panel.tsx
 *
 * Full delivery monitoring panel — Source of Truth edition.
 *
 * Data source: AnnouncementMessage table (created by Backend before RabbitMQ).
 * All recipients are visible immediately after launch (status = pending),
 * and update to sent/failed as n8n callbacks arrive.
 *
 * Sections:
 *   1. Progress bar (queueing phase or delivery phase)
 *   2. Status summary cards (Total / Pending / Sent / Failed)
 *   3. Recipients table with search + filter + pagination
 *   4. Cancel button (active campaigns only)
 */

import { useState, useEffect, useRef, useCallback } from "react"
import {
    CheckCircle2, XCircle, Clock, Users, Loader2,
    Search, ChevronLeft, ChevronRight, PartyPopper,
    Radio, AlertCircle, RefreshCw, Phone, MessageSquare,
    ChevronDown, ChevronUp,
} from "lucide-react"
import { Button }              from "@/components/ui/button"
import { Input }               from "@/components/ui/input"
import { cn }                  from "@/lib/utils"
import { toast }               from "sonner"
import { cancelAnnouncement, getAnnouncementMessages } from "@/lib/actions/announcements"

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgStatus = "pending" | "sent" | "failed" | "all"

interface MessageRow {
    id:             string
    personId:       string | null
    personName:     string | null
    whatsappNumber: string | null
    messageBody:    string
    imageUrls:      string[]
    messageIndex:   number
    status:         string
    providerId:     string | null
    errorReason:    string | null
    retryCount:     number
    queuedAt:       string
    sentAt:         string | null
}

interface ProgressData {
    status:         string
    totalMessages:  number
    successCount:   number
    failCount:      number
    sentCount:      number
    failedMessages: any[] | null
    batchProgress:  any
    sentAt:         string | null
    pendingCount:   number
    sentCountMsg:   number
    failedCount:    number
    queueingPct:    number
    queueingCount:  number
    lastUpdate:     string | null
}

interface DeliveryProgressPanelProps {
    announcementId:       string
    initialStatus:        string
    initialSentCount:     number
    totalBatches:         number
    onComplete:           () => void
    onCancel:             () => void
    messagesPerMinute?:   number
    delayBetweenSeconds?: number
    sendWindowStart?:     string | null
    sendWindowEnd?:       string | null
}

const POLL_INTERVAL_MS  = 5_000
const PAGE_SIZE         = 50

const STATUS_TABS: { key: MsgStatus; label: string; color: string; dot: string }[] = [
    { key: "all",     label: "الكل",      color: "text-foreground",       dot: "bg-muted-foreground"  },
    { key: "pending", label: "معلق",      color: "text-amber-600",        dot: "bg-amber-400"         },
    { key: "sent",    label: "أُرسل",     color: "text-emerald-600",      dot: "bg-emerald-500"       },
    { key: "failed",  label: "فشل",       color: "text-destructive",      dot: "bg-destructive"       },
]

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedCount({ value, className }: { value: number; className?: string }) {
    const [display, setDisplay] = useState(value)
    const prev = useRef(value)
    useEffect(() => {
        if (value === prev.current) return
        const diff = value - prev.current
        const steps = Math.min(Math.abs(diff), 20)
        const step  = diff / steps
        let current = prev.current
        let count   = 0
        const id = setInterval(() => {
            count++
            current += step
            setDisplay(Math.round(count === steps ? value : current))
            if (count >= steps) { clearInterval(id); prev.current = value }
        }, 40)
        return () => clearInterval(id)
    }, [value])
    return <span className={className}>{display.toLocaleString("ar")}</span>
}

// ─── Message Row ──────────────────────────────────────────────────────────────

function MessageRowItem({ msg }: { msg: MessageRow }) {
    const [expanded, setExpanded] = useState(false)

    const statusConfig = {
        pending: { label: "معلق",  bg: "bg-amber-500/10",      text: "text-amber-600",   dot: "bg-amber-400"   },
        sent:    { label: "أُرسل", bg: "bg-emerald-500/10",    text: "text-emerald-600", dot: "bg-emerald-500" },
        failed:  { label: "فشل",  bg: "bg-destructive/10",    text: "text-destructive", dot: "bg-destructive" },
    }[msg.status as "pending" | "sent" | "failed"] ?? { label: msg.status, bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" }

    const previewText = msg.messageBody.length > 80
        ? msg.messageBody.slice(0, 80).trim() + "..."
        : msg.messageBody

    return (
        <div className={cn(
            "border-b border-border/20 transition-colors",
            msg.status === "failed" && "bg-destructive/3"
        )}>
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Index */}
                <span className="text-[10px] font-mono text-muted-foreground/60 w-8 shrink-0 text-center">
                    {msg.messageIndex}
                </span>

                {/* Status dot */}
                <span className={cn("size-2 rounded-full shrink-0", statusConfig.dot,
                    msg.status === "pending" && "animate-pulse"
                )} />

                {/* Name + phone */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{msg.personName ?? "—"}</p>
                    {msg.whatsappNumber && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="size-2.5" />
                            {msg.whatsappNumber}
                        </span>
                    )}
                </div>

                {/* Message preview */}
                <p className="hidden sm:block text-[11px] text-muted-foreground max-w-48 truncate flex-1">
                    {previewText}
                </p>

                {/* Status badge */}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", statusConfig.bg, statusConfig.text)}>
                    {statusConfig.label}
                </span>

                {/* Time */}
                <span className="text-[10px] text-muted-foreground shrink-0 hidden md:block">
                    {msg.sentAt
                        ? new Date(msg.sentAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                </span>

                {/* Expand toggle */}
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="ms-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border/10 bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <MessageSquare className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                                {msg.messageBody}
                            </p>
                        </div>
                        {msg.errorReason && (
                            <div className="flex items-start gap-1.5 text-[11px] text-destructive bg-destructive/5 rounded-lg px-3 py-2">
                                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                                <span>{msg.errorReason}</span>
                            </div>
                        )}
                        {msg.providerId && (
                            <p className="text-[10px] text-muted-foreground font-mono">Provider ID: {msg.providerId}</p>
                        )}
                        {(msg.imageUrls as string[]).length > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                                🖼 {(msg.imageUrls as string[]).length} صورة مرفقة
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeliveryProgressPanel({
    announcementId,
    initialStatus,
    initialSentCount,
    totalBatches,
    onComplete,
    onCancel,
    messagesPerMinute   = 0,
    delayBetweenSeconds = 0,
    sendWindowStart     = null,
    sendWindowEnd       = null,
}: DeliveryProgressPanelProps) {
    // ── Progress state (from /api/announcements/[id]/progress) ──────────────
    const [progress, setProgress] = useState<ProgressData>({
        status:        initialStatus,
        totalMessages: totalBatches,
        successCount:  initialSentCount,
        failCount:     0,
        sentCount:     initialSentCount,
        failedMessages: null,
        batchProgress: null,
        sentAt:        null,
        pendingCount:  0,
        sentCountMsg:  0,
        failedCount:   0,
        queueingPct:   0,
        queueingCount: 0,
        lastUpdate:    null,
    })

    // ── Table state ──────────────────────────────────────────────────────────
    const [messages,    setMessages]    = useState<MessageRow[]>([])
    const [totalMsgs,   setTotalMsgs]   = useState(0)
    const [page,        setPage]        = useState(1)
    const [statusTab,   setStatusTab]   = useState<MsgStatus>("all")
    const [search,      setSearch]      = useState("")
    const [tableLoading, setTableLoading] = useState(false)

    const [cancelling, setCancelling]   = useState(false)

    const pollRef           = useRef<NodeJS.Timeout | null>(null)
    const toastMilestones   = useRef(new Set<number>())

    // ── Poll progress ────────────────────────────────────────────────────────
    const pollProgress = useCallback(async () => {
        try {
            const res  = await fetch(`/api/announcements/${announcementId}/progress`)
            if (!res.ok) return
            const json: ProgressData = await res.json()
            setProgress(json)

            // Milestone toasts
            const total     = json.totalMessages || totalBatches
            const processed = (json.successCount ?? 0) + (json.failCount ?? 0)
            const pct       = total > 0 ? Math.floor((processed / total) * 100) : 0
            for (const milestone of [25, 50, 75]) {
                if (pct >= milestone && !toastMilestones.current.has(milestone)) {
                    toastMilestones.current.add(milestone)
                    toast.info(`📊 ${milestone}% من الرسائل تمت معالجتها`)
                }
            }

            if (json.status === "sent") {
                if (pollRef.current) clearInterval(pollRef.current)
                onComplete()
            }
            if (["cancelled", "failed"].includes(json.status)) {
                if (pollRef.current) clearInterval(pollRef.current)
            }
        } catch { /* retry next tick */ }
    }, [announcementId, onComplete, totalBatches])

    // ── Fetch table data ─────────────────────────────────────────────────────
    const fetchMessages = useCallback(async (
        p    = page,
        tab  = statusTab,
        q    = search,
    ) => {
        setTableLoading(true)
        try {
            const statusFilter = tab === "all" ? undefined : tab
            const res = await getAnnouncementMessages(announcementId, p, PAGE_SIZE, statusFilter)
            if (res.success && res.data) {
                setMessages((res.data as any).messages as MessageRow[] || [])
                setTotalMsgs((res.data as any).total as number || 0)
            }
        } finally {
            setTableLoading(false)
        }
    }, [announcementId, page, statusTab, search])

    // ── Polling setup ────────────────────────────────────────────────────────
    useEffect(() => {
        if (["sent", "cancelled", "failed"].includes(initialStatus)) return
        pollRef.current = setInterval(pollProgress, POLL_INTERVAL_MS)
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [pollProgress, initialStatus])

    // ── Table auto-refresh (every 10s while active) ──────────────────────────
    useEffect(() => {
        fetchMessages(page, statusTab, search)
        if (["queued", "queueing"].includes(progress.status)) {
            const id = setInterval(() => fetchMessages(page, statusTab, search), 10_000)
            return () => clearInterval(id)
        }
    }, [page, statusTab, search, progress.status]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cancel ────────────────────────────────────────────────────────────────
    const handleCancel = async () => {
        if (!confirm("إلغاء الإعلان؟ سيتوقف n8n عن معالجة الرسائل المتبقية.")) return
        setCancelling(true)
        const res = await cancelAnnouncement(announcementId)
        if (res.success) {
            if (pollRef.current) clearInterval(pollRef.current)
            toast.success("تم إلغاء الإعلان")
            onCancel()
        } else { toast.error((res as any).error) }
        setCancelling(false)
    }

    // ── Derived ───────────────────────────────────────────────────────────────
    const total      = progress.totalMessages || totalBatches
    const processed  = (progress.successCount ?? 0) + (progress.failCount ?? 0)
    const pct        = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0
    const successPct = total > 0 ? Math.round(((progress.successCount ?? 0) / total) * 100) : 0
    const failPct    = total > 0 ? Math.round(((progress.failCount    ?? 0) / total) * 100) : 0
    const pendingPct = total > 0 ? Math.max(0, 100 - successPct - failPct) : 0

    const isQueueing  = progress.status === "queueing"
    const isQueued    = progress.status === "queued"
    const isComplete  = progress.status === "sent"
    const isCancelled = progress.status === "cancelled"
    const isFailed    = progress.status === "failed"
    const isTerminal  = isComplete || isCancelled || isFailed
    const isActive    = isQueueing || isQueued

    const totalPages = Math.ceil(totalMsgs / PAGE_SIZE)

    // ─── Queueing phase ───────────────────────────────────────────────────────
    if (isQueueing) {
        const qPct = progress.queueingPct
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-4 bg-primary/5 border border-primary/15 rounded-2xl p-5">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Loader2 className="size-5 text-primary animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary">جاري إعداد الحملة...</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            يتم توليد الرسائل وحفظها — {progress.queueingCount.toLocaleString("ar")} رسالة جاهزة
                        </p>
                        {total > 0 && (
                            <div className="mt-3">
                                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-[width] duration-700"
                                        style={{ width: `${qPct}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 text-end">{qPct}%</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ─── Cancelled / Failed ───────────────────────────────────────────────────
    if (isCancelled || isFailed) {
        return (
            <div className={cn(
                "flex items-center gap-4 rounded-2xl p-5 border",
                isCancelled ? "bg-muted/30 border-border/30" : "bg-destructive/5 border-destructive/20"
            )}>
                <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0",
                    isFailed ? "bg-destructive/10" : "bg-muted/50"
                )}>
                    <XCircle className={cn("size-5", isFailed ? "text-destructive" : "text-muted-foreground")} />
                </div>
                <div>
                    <p className="text-sm font-black">{isCancelled ? "تم الإلغاء" : "فشل الإرسال"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isCancelled ? "يمكن إعادة إطلاق الحملة من البداية" : "حدث خطأ أثناء النشر — راجع الـ Logs"}
                    </p>
                </div>
            </div>
        )
    }

    // ─── Complete (perfect) ───────────────────────────────────────────────────
    if (isComplete && (progress.failCount ?? 0) === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <PartyPopper className="size-8 text-emerald-600" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-black text-emerald-700">اكتمل الإرسال! 🎉</h3>
                    <p className="text-sm text-emerald-600 mt-1">
                        وصلت الرسالة إلى <strong>{progress.successCount}</strong> شخص من أصل <strong>{total}</strong>
                    </p>
                </div>
            </div>
        )
    }

    // ─── Main Monitoring View ─────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Progress Hero ── */}
            <div className={cn(
                "relative overflow-hidden rounded-2xl border p-5",
                isComplete
                    ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-background"
                    : "border-border/50 bg-gradient-to-br from-primary/5 to-background"
            )}>
                {/* Live badge */}
                {!isTerminal && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-xs font-bold text-primary">n8n يُرسل الرسائل الآن</span>
                        <span className="mr-auto text-xs text-muted-foreground">يتحدث كل 5 ثوانٍ</span>
                    </div>
                )}

                {/* Big number */}
                <div className="flex items-end justify-between mb-5">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <AnimatedCount value={processed} className="text-5xl font-black tabular-nums" />
                            <span className="text-xl font-bold text-muted-foreground">/ {total}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">رسالة معالجة</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-primary">{pct}%</p>
                        <p className="text-xs text-muted-foreground">مكتمل</p>
                    </div>
                </div>

                {/* Segmented bar: green=sent, red=failed, amber=pending */}
                <div className="h-3 rounded-full bg-muted/40 overflow-hidden flex mb-4">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-700"
                        style={{ width: `${successPct}%` }} />
                    <div className="h-full bg-gradient-to-r from-destructive/80 to-red-400 transition-[width] duration-700"
                        style={{ width: `${failPct}%` }} />
                    <div className="h-full bg-amber-400/40 transition-[width] duration-700"
                        style={{ width: `${pendingPct}%` }} />
                </div>

                {/* Counters */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-0.5 bg-emerald-500/8 rounded-xl p-3 text-center">
                        <CheckCircle2 className="size-4 text-emerald-600 mx-auto" />
                        <AnimatedCount value={progress.successCount ?? 0} className="text-xl font-black text-emerald-600" />
                        <span className="text-[10px] text-muted-foreground">أُرسل</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-destructive/5 rounded-xl p-3 text-center">
                        <AlertCircle className="size-4 text-destructive mx-auto" />
                        <AnimatedCount value={progress.failCount ?? 0} className="text-xl font-black text-destructive" />
                        <span className="text-[10px] text-muted-foreground">فشل</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-amber-500/8 rounded-xl p-3 text-center">
                        <Clock className="size-4 text-amber-500 mx-auto" />
                        <AnimatedCount value={progress.pendingCount ?? Math.max(0, total - processed)} className="text-xl font-black text-amber-500" />
                        <span className="text-[10px] text-muted-foreground">معلق</span>
                    </div>
                </div>

                {/* Throttle info */}
                {(messagesPerMinute > 0 || delayBetweenSeconds > 0 || sendWindowStart) && (
                    <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border/20">
                        <Radio className="size-3.5 text-muted-foreground self-center" />
                        {messagesPerMinute > 0 && (
                            <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                                ⚡ {messagesPerMinute}/دقيقة
                            </span>
                        )}
                        {delayBetweenSeconds > 0 && (
                            <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 rounded-full px-2 py-0.5">
                                ⏱ {delayBetweenSeconds}ث تأخير
                            </span>
                        )}
                        {sendWindowStart && sendWindowEnd && (
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5">
                                🕐 {sendWindowStart} — {sendWindowEnd}
                            </span>
                        )}
                    </div>
                )}

                {/* Cancel */}
                {!isTerminal && (
                    <Button size="sm" variant="ghost" disabled={cancelling} onClick={handleCancel}
                        className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 w-fit mt-4">
                        {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                        إلغاء الإعلان
                    </Button>
                )}
            </div>

            {/* ── Recipients Table ── */}
            <div className="rounded-2xl border border-border/50 overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border/30">
                    <Users className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        الزبائن المستهدفون
                    </h3>
                    <span className="mr-auto text-[10px] text-muted-foreground">{totalMsgs.toLocaleString("ar")} زبون</span>
                    <button
                        type="button"
                        onClick={() => fetchMessages(page, statusTab, search)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className={cn("size-3.5", tableLoading && "animate-spin")} />
                    </button>
                </div>

                {/* Search + Filter tabs */}
                <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-border/20 bg-muted/10">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="بحث باسم الزبون أو الهاتف..."
                            className="pr-9 h-8 text-xs rounded-xl"
                        />
                    </div>

                    {/* Status tabs */}
                    <div className="flex rounded-xl border border-border/60 overflow-hidden h-8 shrink-0">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => { setStatusTab(tab.key); setPage(1) }}
                                className={cn(
                                    "px-3 text-[11px] font-bold flex items-center gap-1.5 transition-all border-r border-border/30 last:border-r-0",
                                    statusTab === tab.key
                                        ? cn("bg-background shadow-sm", tab.color)
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className={cn("size-1.5 rounded-full shrink-0", statusTab === tab.key ? tab.dot : "bg-muted-foreground/40")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table body */}
                <div className="divide-y divide-border/10">
                    {tableLoading && messages.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                            <Users className="size-7 opacity-30" />
                            <p className="text-xs">لا توجد نتائج</p>
                        </div>
                    ) : (
                        messages.map(msg => <MessageRowItem key={msg.id} msg={msg} />)
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/20 bg-muted/10">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <ChevronRight className="size-3.5" />
                            السابق
                        </button>
                        <span className="text-[11px] text-muted-foreground">
                            صفحة {page} من {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                        >
                            التالي
                            <ChevronLeft className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
