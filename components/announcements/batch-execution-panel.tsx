"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Play, Pause, X, CheckCircle2, Loader2, Clock, Send,
    AlertCircle, Users, Layers, ChevronDown, PartyPopper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    processBatch,
    getAnnouncementProgress,
    pauseBatchExecution,
    resumeBatchExecution,
    cancelBatchExecution,
    type BatchProgress,
    type BatchEntry,
} from "@/lib/actions/announcements"
import { toast } from "sonner"

interface BatchExecutionPanelProps {
    announcementId: string
    initialStatus: string
    initialProgress: BatchProgress
    intervalMinutes: number
    onComplete: () => void
    onCancel: () => void
}

function formatCountdown(ms: number) {
    if (ms <= 0) return "الآن"
    const totalSec = Math.ceil(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return min > 0 ? `${min}:${String(sec).padStart(2, "0")}` : `${sec}ث`
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

const BATCH_STATUS_CONFIG = {
    pending:  { icon: Clock,         color: "text-muted-foreground", bg: "bg-muted/30",          label: "في الانتظار"   },
    sending:  { icon: Loader2,       color: "text-primary animate-spin", bg: "bg-primary/10",    label: "جاري الإرسال" },
    sent:     { icon: CheckCircle2,  color: "text-emerald-600",      bg: "bg-emerald-500/10",    label: "تم الإرسال"   },
    failed:   { icon: AlertCircle,   color: "text-destructive",      bg: "bg-destructive/10",    label: "فشل"          },
}

export function BatchExecutionPanel({
    announcementId,
    initialStatus,
    initialProgress,
    intervalMinutes,
    onComplete,
    onCancel,
}: BatchExecutionPanelProps) {
    const [status, setStatus] = useState(initialStatus)
    const [progress, setProgress] = useState<BatchProgress>(initialProgress)
    const [countdown, setCountdown] = useState<number | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showAll, setShowAll] = useState(false)

    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const pollRef = useRef<NodeJS.Timeout | null>(null)
    const countdownRef = useRef<NodeJS.Timeout | null>(null)

    const clearAll = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (pollRef.current) clearInterval(pollRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
    }

    // Poll for progress every 4 seconds
    const poll = useCallback(async () => {
        const res = await getAnnouncementProgress(announcementId)
        if (!res.success || !res.data) return
        const data = res.data as any
        setStatus(data.status)
        if (data.batchProgress && Object.keys(data.batchProgress).length > 0) {
            setProgress(data.batchProgress as BatchProgress)
        }
        if (data.status === "sent") {
            clearAll()
            onComplete()
        }
    }, [announcementId, onComplete])

    // Countdown ticker
    const startCountdown = useCallback((targetIso: string) => {
        if (countdownRef.current) clearInterval(countdownRef.current)
        const tick = () => {
            const ms = new Date(targetIso).getTime() - Date.now()
            setCountdown(ms)
        }
        tick()
        countdownRef.current = setInterval(tick, 1000)
    }, [])

    // Schedule next batch
    const scheduleNextBatch = useCallback((nextBatchAt: string) => {
        if (timerRef.current) clearTimeout(timerRef.current)  // clear any existing timer first
        const delay = Math.max(0, new Date(nextBatchAt).getTime() - Date.now())
        startCountdown(nextBatchAt)
        timerRef.current = setTimeout(async () => {
            timerRef.current = null  // clear ref so guard in useEffect works correctly
            if (countdownRef.current) clearInterval(countdownRef.current)
            setCountdown(null)
            setIsProcessing(true)
            const res = await processBatch(announcementId)
            setIsProcessing(false)
            if (res.success && res.data) {
                const d = res.data as any
                await poll()
                if (!d.isComplete && d.nextBatchAt) {
                    scheduleNextBatch(d.nextBatchAt)
                }
            } else {
                toast.error("فشل إرسال الدُفعة: " + (res as any).error)
            }
        }, delay)
    }, [announcementId, poll, startCountdown])

    // On mount, start polling + drive batch sending
    useEffect(() => {
        pollRef.current = setInterval(poll, 4000)

        async function kickoff() {
            if (initialStatus === "running") {
                if (initialProgress.currentBatch === 0) {
                    // First-ever batch: send it now (server only saved the plan)
                    setIsProcessing(true)
                    const res = await processBatch(announcementId)
                    setIsProcessing(false)
                    if (res.success && res.data) {
                        const d = res.data as any
                        await poll()
                        if (!d.isComplete && d.nextBatchAt) scheduleNextBatch(d.nextBatchAt)
                    } else {
                        toast.error("فشل إرسال الدُفعة الأولى: " + (res as any).error)
                    }
                } else if (initialProgress.nextBatchAt) {
                    // Resumed after page reload: schedule the next pending batch
                    scheduleNextBatch(initialProgress.nextBatchAt)
                }
            }
        }
        kickoff()

        return () => clearAll()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Also update schedule when progress changes externally
    useEffect(() => {
        if (status === "running" && progress.nextBatchAt && !timerRef.current) {
            scheduleNextBatch(progress.nextBatchAt)
        }
    }, [progress.nextBatchAt, status]) // eslint-disable-line react-hooks/exhaustive-deps

    const pct = progress.totalPersons > 0
        ? Math.round((progress.sentCount / progress.totalPersons) * 100)
        : 0

    const handlePause = async () => {
        clearAll()
        const res = await pauseBatchExecution(announcementId)
        if (res.success) { setStatus("paused"); toast.success("تم إيقاف الإرسال مؤقتاً") }
        else toast.error((res as any).error)
    }

    const handleResume = async () => {
        const res = await resumeBatchExecution(announcementId)
        if (res.success) {
            setStatus("running")
            toast.success("تم استئناف الإرسال")
            // Immediately send next pending batch
            const nextIdx = progress.batches.findIndex(b => b.status === "pending")
            if (nextIdx !== -1) {
                setIsProcessing(true)
                const batchRes = await processBatch(announcementId)
                setIsProcessing(false)
                if (batchRes.success && batchRes.data) {
                    const d = batchRes.data as any
                    await poll()
                    pollRef.current = setInterval(poll, 4000)
                    if (!d.isComplete && d.nextBatchAt) scheduleNextBatch(d.nextBatchAt)
                }
            }
        } else toast.error((res as any).error)
    }

    const handleCancel = async () => {
        if (!confirm("إلغاء الإرسال وحذف تقدم الدُفعات؟")) return
        clearAll()
        const res = await cancelBatchExecution(announcementId)
        if (res.success) { toast.success("تم إلغاء الإرسال"); onCancel() }
        else toast.error((res as any).error)
    }

    const visibleBatches = showAll ? progress.batches : progress.batches?.slice(0, 5)
    const isComplete = status === "sent"
    const isPaused = status === "paused"
    const isRunning = status === "running"

    if (isComplete) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                    <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <PartyPopper className="size-8 text-emerald-600" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-black text-emerald-700">اكتمل الإرسال! 🎉</h3>
                        <p className="text-sm text-emerald-600 mt-1">
                            أُرسل إلى {progress.sentCount} شخص على {progress.totalBatches} دُفعة
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Progress card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-primary/5 to-background p-5 space-y-4">
                {/* Animated background pulse when running */}
                {isRunning && (
                    <div className="absolute inset-0 bg-primary/3 animate-pulse rounded-2xl pointer-events-none" />
                )}

                {/* Status badge row */}
                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                        {isRunning && <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>}
                        {isPaused && <span className="size-2 rounded-full bg-amber-500" />}
                        <span className={cn(
                            "text-xs font-bold",
                            isRunning ? "text-primary" : isPaused ? "text-amber-600" : "text-muted-foreground"
                        )}>
                            {isRunning ? "جاري الإرسال..." : isPaused ? "متوقف مؤقتاً" : "جاري المعالجة..."}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Layers className="size-3.5" />
                        <span>دُفعة {progress.currentBatch} من {progress.totalBatches}</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-primary">
                            <Users className="size-3.5" />
                            {progress.sentCount} / {progress.totalPersons} شخص
                        </span>
                        <span className="text-foreground">{pct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/40 overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-700",
                                isPaused
                                    ? "bg-amber-400"
                                    : "bg-linear-to-r from-primary to-indigo-400"
                            )}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                {/* Countdown */}
                {isRunning && countdown !== null && countdown > 0 && (
                    <div className="flex items-center justify-between bg-background/60 rounded-xl px-4 py-3 border border-border/30">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="size-3.5" />
                            الدُفعة التالية ({Math.ceil(intervalMinutes)} دقيقة) خلال:
                        </span>
                        <span className="text-sm font-black tabular-nums text-primary">
                            {formatCountdown(countdown)}
                        </span>
                    </div>
                )}

                {isProcessing && (
                    <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                        <Loader2 className="size-3.5 animate-spin" />
                        جاري إرسال الدُفعة...
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-2 pt-1">
                    {isRunning ? (
                        <Button size="sm" variant="outline"
                            className="gap-1.5 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            onClick={handlePause}>
                            <Pause className="size-3.5" /> إيقاف مؤقت
                        </Button>
                    ) : isPaused ? (
                        <Button size="sm"
                            className="gap-1.5 rounded-xl shadow-sm"
                            onClick={handleResume}>
                            <Play className="size-3.5" /> استئناف
                        </Button>
                    ) : null}
                    <Button size="sm" variant="ghost"
                        className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={handleCancel}>
                        <X className="size-3.5" /> إلغاء
                    </Button>
                </div>
            </div>

            {/* Batch timeline */}
            <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">سجل الدُفعات</p>
                <div className="space-y-1.5">
                    {visibleBatches?.map((batch: BatchEntry) => {
                        const cfg = BATCH_STATUS_CONFIG[batch.status]
                        const Icon = cfg.icon
                        return (
                            <div key={batch.index}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-4 py-3 border transition-all",
                                    batch.status === "sent" ? "border-emerald-500/15 bg-emerald-500/5" :
                                    batch.status === "sending" ? "border-primary/20 bg-primary/5" :
                                    batch.status === "failed" ? "border-destructive/20 bg-destructive/5" :
                                    "border-border/30 bg-muted/20"
                                )}>
                                <div className={cn("size-7 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
                                    <Icon className={cn("size-3.5", cfg.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">
                                            دُفعة {batch.index} — {batch.count} شخص
                                        </span>
                                        <span className={cn("text-[11px] font-semibold", cfg.color)}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    {batch.sentAt && (
                                        <span className="text-[11px] text-muted-foreground">
                                            أُرسلت الساعة {formatTime(batch.sentAt)}
                                        </span>
                                    )}
                                    {batch.error && (
                                        <span className="text-[11px] text-destructive">{batch.error}</span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {progress.batches?.length > 5 && (
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
                        <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
                        {showAll ? "عرض أقل" : `عرض ${progress.batches.length - 5} دُفعات إضافية`}
                    </button>
                )}
            </div>
        </div>
    )
}
