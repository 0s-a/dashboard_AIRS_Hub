"use client"

/**
 * components/announcements/batch-execution-panel.tsx
 *
 * Monitoring UI — polls /api/announcements/[id]/progress every 5 seconds.
 * Shows animated counters, segmented progress bar, and detailed failure table.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import {
    CheckCircle2, Loader2, XCircle, Users, Layers,
    PartyPopper, Radio, AlertCircle, RefreshCw, Phone,
} from "lucide-react"
import { Button }             from "@/components/ui/button"
import { cn }                 from "@/lib/utils"
import { toast }              from "sonner"
import { cancelAnnouncement } from "@/lib/actions/announcements"
import { RetryFailedPanel }   from "./retry-failed-panel"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FailedEntry {
    personId:     string
    personName:   string | null
    contact:      string | null
    reason:       string
    failedAt:     string
    messageIndex: number
    retryCount:   number
}

interface ProgressData {
    status:         string
    totalMessages:  number
    successCount:   number
    failCount:      number
    sentCount:      number
    failedMessages: FailedEntry[] | null
    batchProgress:  any
    sentAt:         string | null
}

interface MonitoringPanelProps {
    announcementId:      string
    initialStatus:       string
    initialSentCount:    number
    totalBatches:        number
    batchSize:           number
    onComplete:          () => void
    onCancel:            () => void
    messagesPerMinute?:  number
    delayBetweenSeconds?: number
    sendWindowStart?:    string | null
    sendWindowEnd?:      string | null
}

const POLL_INTERVAL_MS = 5_000

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedCount({ value, className }: { value: number; className?: string }) {
    const [display, setDisplay] = useState(value)
    const prev                  = useRef(value)

    useEffect(() => {
        if (value === prev.current) return
        const diff  = value - prev.current
        const steps = Math.min(Math.abs(diff), 20)
        const step  = diff / steps
        let current = prev.current
        let count   = 0

        const id = setInterval(() => {
            count++
            current += step
            setDisplay(Math.round(count === steps ? value : current))
            if (count >= steps) {
                clearInterval(id)
                prev.current = value
            }
        }, 40)

        return () => clearInterval(id)
    }, [value])

    return <span className={className}>{display.toLocaleString("ar")}</span>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BatchExecutionPanel({
    announcementId,
    initialStatus,
    initialSentCount,
    totalBatches,
    batchSize,
    onComplete,
    onCancel,
    messagesPerMinute   = 0,
    delayBetweenSeconds = 0,
    sendWindowStart     = null,
    sendWindowEnd       = null,
}: MonitoringPanelProps) {
    const [data, setData] = useState<ProgressData>({
        status:         initialStatus,
        totalMessages:  totalBatches,
        successCount:   initialSentCount,
        failCount:      0,
        sentCount:      initialSentCount,
        failedMessages: null,
        batchProgress:  null,
        sentAt:         null,
    })
    const [cancelling,      setCancelling]      = useState(false)
    const [showFailedTable, setShowFailedTable] = useState(false)
    const pollRef    = useRef<NodeJS.Timeout | null>(null)
    const toastMilestones = useRef(new Set<number>())

    // ── Polling ───────────────────────────────────────────────────────────────
    const poll = useCallback(async () => {
        try {
            const res  = await fetch(`/api/announcements/${announcementId}/progress`)
            if (!res.ok) return
            const json: ProgressData = await res.json()
            setData(json)

            // Toast at 25%, 50%, 75%, 100%
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

    useEffect(() => {
        if (["sent", "cancelled", "failed"].includes(initialStatus)) return
        pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [poll, initialStatus])

    // ── Cancel ────────────────────────────────────────────────────────────────
    const handleCancel = async () => {
        if (!confirm("إلغاء الإعلان؟ سيتوقف n8n عن معالجة الرسائل المتبقية.")) return
        setCancelling(true)
        const res = await cancelAnnouncement(announcementId)
        if (res.success) {
            if (pollRef.current) clearInterval(pollRef.current)
            toast.success("تم إلغاء الإعلان")
            onCancel()
        } else {
            toast.error((res as any).error)
        }
        setCancelling(false)
    }

    // ── Derived ───────────────────────────────────────────────────────────────
    const total       = data.totalMessages || totalBatches
    const processed   = (data.successCount ?? 0) + (data.failCount ?? 0)
    const remaining   = Math.max(0, total - processed)
    const pct         = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0
    const successPct  = total > 0 ? Math.round(((data.successCount ?? 0) / total) * 100) : 0
    const failPct     = total > 0 ? Math.round(((data.failCount ?? 0) / total) * 100) : 0

    const isComplete  = data.status === "sent"
    const isCancelled = data.status === "cancelled"
    const isFailed    = data.status === "failed"
    const isQueueing  = data.status === "queueing"
    const isTerminal  = isComplete || isCancelled || isFailed

    const failedMessages = data.failedMessages ?? []

    // ── Queueing ──────────────────────────────────────────────────────────────
    if (isQueueing) {
        return (
            <div className="flex items-center gap-4 bg-primary/5 border border-primary/15 rounded-2xl p-5">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Loader2 className="size-5 text-primary animate-spin" />
                </div>
                <div>
                    <p className="text-sm font-bold text-primary">جاري النشر على RabbitMQ...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">يتم إنشاء رسالة مستقلة لكل شخص في الجمهور</p>
                </div>
            </div>
        )
    }

    // ── Cancelled / Failed ────────────────────────────────────────────────────
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

    // ── Complete (no failures) ────────────────────────────────────────────────
    if (isComplete && failedMessages.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <PartyPopper className="size-8 text-emerald-600" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-black text-emerald-700">اكتمل الإرسال! 🎉</h3>
                    <p className="text-sm text-emerald-600 mt-1">
                        وصلت الرسالة إلى <strong>{data.successCount}</strong> شخص من أصل <strong>{total}</strong>
                    </p>
                </div>
            </div>
        )
    }

    // ── Main Monitoring View ──────────────────────────────────────────────────
    return (
        <div className="space-y-4">

            {/* ── Hero Counter ── */}
            <div className={cn(
                "relative overflow-hidden rounded-2xl border p-6",
                isComplete
                    ? "border-emerald-500/20 bg-linear-to-br from-emerald-500/5 to-background"
                    : "border-border/50 bg-linear-to-br from-primary/5 to-background"
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
                            <AnimatedCount
                                value={processed}
                                className="text-5xl font-black tabular-nums"
                            />
                            <span className="text-xl font-bold text-muted-foreground">/ {total}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">رسالة معالجة</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-primary">{pct}%</p>
                        <p className="text-xs text-muted-foreground">مكتمل</p>
                    </div>
                </div>

                {/* Segmented bar */}
                <div className="h-3 rounded-full bg-muted/40 overflow-hidden flex mb-3">
                    <div className="h-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-[width] duration-700"
                        style={{ width: `${successPct}%` }} />
                    <div className="h-full bg-linear-to-r from-destructive/80 to-red-400 transition-[width] duration-700"
                        style={{ width: `${failPct}%` }} />
                </div>

                {/* Counters row */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-0.5 bg-emerald-500/8 rounded-xl p-3 text-center">
                        <CheckCircle2 className="size-4 text-emerald-600 mx-auto" />
                        <AnimatedCount value={data.successCount ?? 0} className="text-xl font-black text-emerald-600" />
                        <span className="text-[10px] text-muted-foreground">ناجح</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-destructive/5 rounded-xl p-3 text-center">
                        <AlertCircle className="size-4 text-destructive mx-auto" />
                        <AnimatedCount value={data.failCount ?? 0} className="text-xl font-black text-destructive" />
                        <span className="text-[10px] text-muted-foreground">فاشل</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-muted/30 rounded-xl p-3 text-center">
                        <Layers className="size-4 text-muted-foreground mx-auto" />
                        <AnimatedCount value={remaining} className="text-xl font-black text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">متبقي</span>
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

            {/* ── Failed Messages Table ── */}
            {failedMessages.length > 0 && (
                <div className="rounded-2xl border border-destructive/20 overflow-hidden">
                    {/* Toggle header */}
                    <button
                        type="button"
                        onClick={() => setShowFailedTable(v => !v)}
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-destructive/5 hover:bg-destructive/8 transition-colors"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold text-destructive">
                            <AlertCircle className="size-4" />
                            {failedMessages.length} رسالة فاشلة
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {showFailedTable ? "إخفاء" : "عرض التفاصيل"}
                            </span>
                            <RefreshCw className="size-3.5 text-muted-foreground" />
                        </div>
                    </button>

                    {/* Table */}
                    {showFailedTable && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border/30 bg-muted/20">
                                        <th className="text-right font-bold text-muted-foreground px-4 py-2.5">#</th>
                                        <th className="text-right font-bold text-muted-foreground px-4 py-2.5">الاسم</th>
                                        <th className="text-right font-bold text-muted-foreground px-4 py-2.5">رقم التواصل</th>
                                        <th className="text-right font-bold text-muted-foreground px-4 py-2.5">سبب الفشل</th>
                                        <th className="text-right font-bold text-muted-foreground px-4 py-2.5">المحاولات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {failedMessages.map((f, i) => (
                                        <tr key={f.personId} className={cn(
                                            "border-b border-border/20 transition-colors hover:bg-muted/10",
                                            i % 2 === 0 ? "bg-background" : "bg-muted/5"
                                        )}>
                                            <td className="px-4 py-3 text-muted-foreground font-mono">{f.messageIndex}</td>
                                            <td className="px-4 py-3 font-semibold">{f.personName ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Phone className="size-3" />
                                                    {f.contact ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-48">
                                                <span className="text-destructive truncate block" title={f.reason}>
                                                    {f.reason}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "font-bold rounded-full px-2 py-0.5",
                                                    f.retryCount > 0
                                                        ? "bg-amber-500/10 text-amber-600"
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    {f.retryCount + 1}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Retry panel below table */}
                    <div className="p-4 border-t border-border/20 bg-muted/5">
                        <RetryFailedPanel
                            announcementId={announcementId}
                            failedMessages={failedMessages}
                            onRetried={() => {
                                if (pollRef.current) clearInterval(pollRef.current)
                                pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
