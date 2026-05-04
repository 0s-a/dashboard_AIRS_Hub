"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    Users, Package, CalendarClock, Send, Play, Trash2,
    ChevronLeft, FileText, ImageIcon, Zap, CheckCircle2, XCircle,
    Copy, Clock3,
} from "lucide-react"
import { Badge }   from "@/components/ui/badge"
import { Button }  from "@/components/ui/button"
import { cn }      from "@/lib/utils"
import { deleteAnnouncement, executeAnnouncementToQueue, cloneAnnouncement } from "@/lib/actions/announcements"
import { toast }   from "sonner"
import type { AnnouncementRow } from "./announcement-columns"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnouncementCardProps {
    announcement: AnnouncementRow & {
        successCount?:   number
        totalMessages?:  number
        templateName?:   string
        templateType?:   string
    }
    onRefresh: () => void
    compact?:  boolean
}

// ─── Duration Estimate ────────────────────────────────────────────────────────

function estimateDuration(total: number, mpm: number, delay: number): string | null {
    if (!total || total === 0) return null
    if (mpm > 0) {
        const mins = Math.ceil(total / mpm)
        return mins < 60 ? `~${mins} دقيقة` : `~${(mins / 60).toFixed(1)} ساعة`
    }
    if (delay > 0) {
        const secs = total * delay
        const mins = Math.ceil(secs / 60)
        return mins < 60 ? `~${mins} دقيقة` : `~${(mins / 60).toFixed(1)} ساعة`
    }
    return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
    label:  string
    badge:  string
    dot:    string
    border: string
    pulse:  boolean
}> = {
    pending:   { label: "مسودة",         badge: "bg-muted text-muted-foreground border-0",           dot: "bg-muted-foreground",  border: "border-border/50",         pulse: false },
    queueing:  { label: "جاري النشر...", badge: "bg-primary/10 text-primary border-0",               dot: "bg-primary",           border: "border-primary/20",        pulse: true  },
    queued:    { label: "في الطابور",   badge: "bg-indigo-500/10 text-indigo-600 border-0",           dot: "bg-indigo-500",        border: "border-indigo-500/20",     pulse: true  },
    sent:      { label: "تم الإرسال",  badge: "bg-emerald-500/10 text-emerald-600 border-0",         dot: "bg-emerald-500",       border: "border-emerald-500/20",    pulse: false },
    failed:    { label: "فشل",          badge: "bg-destructive/10 text-destructive border-0",         dot: "bg-destructive",       border: "border-destructive/20",    pulse: false },
    cancelled: { label: "ملغى",         badge: "bg-muted text-muted-foreground border-0",             dot: "bg-muted-foreground",  border: "border-border/40",         pulse: false },
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function AnnouncementCard({ announcement: ann, onRefresh, compact = false }: AnnouncementCardProps) {
    const router = useRouter()
    const cfg = STATUS_CONFIG[ann.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending

    const pFilters = ann.personFilters as any
    const rFilters = ann.productFilters as any
    const personLabel = pFilters?.all
        ? "الكل"
        : pFilters?.manualIds?.length > 0
            ? `${pFilters.manualIds.length} شخص`
            : "فلتر"
    const productLabel = rFilters?.all
        ? "الكل"
        : rFilters?.manualIds?.length > 0
            ? `${rFilters.manualIds.length} منتج`
            : "فلتر"

    // Progress for sent announcements
    const total   = (ann as any).totalMessages ?? 0
    const success = (ann as any).successCount ?? 0
    const pct     = total > 0 ? Math.min(100, Math.round((success / total) * 100)) : 0
    const hasPct  = ann.status === "sent" && total > 0

    // Template
    const templateName = (ann as any).templateName as string | undefined
    const templateType = (ann as any).templateType as string | undefined
    const TemplateIcon = templateType === "text_image" ? ImageIcon : FileText

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (!confirm(`حذف الإعلان "${ann.title}"؟`)) return
        const res = await deleteAnnouncement(ann.id)
        if (res.success) { toast.success("تم الحذف"); onRefresh() }
        else toast.error(res.error)
    }

    const handleExecute = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (!confirm(`إطلاق حملة "${ann.title}"؟`)) return
        const toastId = toast.loading("جاري النشر...")
        const res = await executeAnnouncementToQueue(ann.id)
        toast.dismiss(toastId)
        if (res.success) {
            toast.success(`✅ تم وضع ${(res.data as any)?.totalBatches ?? 0} دُفعة في الطابور`)
            onRefresh()
        } else toast.error((res as any).error)
    }

    const handleClone = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        const toastId = toast.loading("جاري الاستنساخ...")
        const res = await cloneAnnouncement(ann.id)
        toast.dismiss(toastId)
        if (res.success && (res.data as any)?.id) {
            toast.success("✅ تم إنشاء نسخة جديدة")
            router.push(`/announcements/${(res.data as any).id}`)
        } else toast.error((res as any).error ?? "فشل الاستنساخ")
    }

    // ── Compact (list) mode ───────────────────────────────────────────────────
    if (compact) {
        return (
            <Link
                href={`/announcements/${ann.id}`}
                className={cn(
                    "group flex items-center gap-4 glass-panel rounded-xl border px-5 py-3.5 transition-all duration-200",
                    "hover:shadow-md hover:border-primary/20 hover:-translate-y-px",
                    cfg.border
                )}
            >
                {/* Status dot */}
                <span className="relative flex size-2.5 shrink-0">
                    {cfg.pulse && (
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", cfg.dot)} />
                    )}
                    <span className={cn("relative inline-flex rounded-full size-2.5", cfg.dot)} />
                </span>

                {/* Title + badge */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{ann.title}</span>
                        <Badge className={cfg.badge}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {formatDate(ann.scheduledAt)}
                        {templateName && ` · ${templateName}`}
                    </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Users className="size-3.5" />{personLabel}</span>
                    <span className="flex items-center gap-1"><Package className="size-3.5" />{productLabel}</span>
                    {hasPct && (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 className="size-3.5" />{pct}%
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!["sent", "queued", "queueing"].includes(ann.status) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                            onClick={handleExecute} title="تنفيذ"><Play className="size-3.5" /></Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                        onClick={handleClone} title="نسخ">
                        <Copy className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleDelete} title="حذف"><Trash2 className="size-3.5" /></Button>
                    <ChevronLeft className="size-4 text-primary" />
                </div>
            </Link>
        )
    }

    // ── Grid mode ─────────────────────────────────────────────────────────────
    return (
        <Link
            href={`/announcements/${ann.id}`}
            className={cn(
                "group relative glass-panel rounded-2xl border p-5 block transition-all duration-300",
                "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5",
                cfg.border
            )}
        >
            {/* Top accent line */}
            <div className={cn(
                "absolute top-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300",
                ann.status === "sent"    ? "bg-emerald-500/60" :
                ann.status === "failed"  ? "bg-destructive/60" :
                ann.status === "queued" || ann.status === "queueing" ? "bg-primary/40" :
                "bg-border/40 group-hover:bg-primary/30"
            )} />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {ann.title}
                    </h3>
                    {ann.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {ann.description}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="relative flex size-2">
                        {cfg.pulse && (
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", cfg.dot)} />
                        )}
                        <span className={cn("relative inline-flex rounded-full size-2", cfg.dot)} />
                    </span>
                    <Badge className={cfg.badge}>{cfg.label}</Badge>
                </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="flex flex-col gap-1 bg-muted/30 rounded-xl p-2.5">
                    <CalendarClock className="size-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">الموعد</span>
                    <span className="text-xs font-bold leading-tight">{formatDate(ann.scheduledAt)}</span>
                </div>
                <div className="flex flex-col gap-1 bg-primary/5 rounded-xl p-2.5">
                    <Users className="size-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">الأشخاص</span>
                    <span className="text-xs font-bold text-primary">{personLabel}</span>
                </div>
                <div className="flex flex-col gap-1 bg-indigo-500/5 rounded-xl p-2.5">
                    <Package className="size-3.5 text-indigo-500" />
                    <span className="text-[10px] text-muted-foreground">المنتجات</span>
                    <span className="text-xs font-bold text-indigo-500">{productLabel}</span>
                </div>
            </div>

            {/* Template row */}
            {templateName && (
                <div className="flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground">
                    <TemplateIcon className="size-3 shrink-0" />
                    <span className="truncate">{templateName}</span>
                </div>
            )}

            {/* Success progress bar (sent announcements) */}
            {hasPct && (
                <div className="mb-3 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> {success} شخص
                        </span>
                        <span className="text-muted-foreground">{pct}% نجاح</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                            className="h-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                {ann.status === "sent" && ann.sentAt ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <Send className="size-3" />
                        تم الإرسال · {formatDate(ann.sentAt)}
                    </span>
                ) : (
                    <span className="text-[11px] text-muted-foreground/60">
                        {formatDate(ann.createdAt)}
                    </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!["sent", "queued", "queueing"].includes(ann.status) && (
                        <Button size="icon" variant="ghost"
                            className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                            onClick={handleExecute} title="تنفيذ الآن">
                            <Zap className="size-3.5" />
                        </Button>
                    )}
                    <Button size="icon" variant="ghost"
                        className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                        onClick={handleClone} title="نسخ الإعلان">
                        <Copy className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                        className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleDelete} title="حذف">
                        <Trash2 className="size-3.5" />
                    </Button>
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg px-2 py-1">
                        فتح <ChevronLeft className="size-3" />
                    </div>
                </div>
            </div>
        </Link>
    )
}
