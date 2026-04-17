"use client"

import Link from "next/link"
import { Users, Package, CalendarClock, Send, FileText, AlertCircle, Play, Pencil, Trash2, ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { deleteAnnouncement, executeAnnouncement } from "@/lib/actions/announcements"
import { toast } from "sonner"
import type { AnnouncementRow } from "./announcement-columns"

interface AnnouncementCardProps {
    announcement: AnnouncementRow
    onRefresh: () => void
}

function formatDate(d: Date | string | null) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

const STATUS_CONFIG = {
    draft:  { label: "مسودة",        badge: "bg-muted text-muted-foreground border-0", dot: "bg-muted-foreground", pulse: false },
    sent:   { label: "تم الإرسال",   badge: "bg-emerald-500/10 text-emerald-600 border-0", dot: "bg-emerald-500", pulse: true  },
    failed: { label: "فشل الإرسال", badge: "bg-destructive/10 text-destructive border-0",  dot: "bg-destructive",  pulse: false },
}

export function AnnouncementCard({ announcement: ann, onRefresh }: AnnouncementCardProps) {
    const cfg = STATUS_CONFIG[ann.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft

    const pFilters = ann.personFilters as any
    const rFilters = ann.productFilters as any
    const personLabel = pFilters?.all
        ? "الكل"
        : (ann.personIds as string[])?.length > 0
            ? `${(ann.personIds as string[]).length} شخص`
            : "غير محدد"
    const productLabel = rFilters?.all
        ? "الكل"
        : (ann.productIds as string[])?.length > 0
            ? `${(ann.productIds as string[]).length} منتج`
            : "غير محدد"

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(`حذف الإعلان "${ann.title}"؟`)) return
        const res = await deleteAnnouncement(ann.id)
        if (res.success) { toast.success("تم الحذف"); onRefresh() }
        else toast.error(res.error)
    }

    const handleExecute = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(`تنفيذ الإعلان "${ann.title}" الآن؟`)) return
        const toastId = toast.loading("جاري الإرسال...")
        const res = await executeAnnouncement(ann.id)
        toast.dismiss(toastId)
        if (res.success) {
            const d = res.data as any
            toast.success(`✅ تم الإرسال إلى ${d?.sentCount ?? 0} شخص`)
            onRefresh()
        } else toast.error(res.error)
    }

    return (
        <Link
            href={`/announcements/${ann.id}`}
            className={cn(
                "group relative glass-panel rounded-2xl border p-5 block transition-all duration-300",
                "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 hover:border-primary/30",
                ann.status === "draft" ? "border-border/50" : ann.status === "sent" ? "border-emerald-500/20" : "border-destructive/20"
            )}
        >
            {/* Status indicator line at top */}
            <div className={cn(
                "absolute top-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300",
                ann.status === "sent" ? "bg-emerald-500/50" : ann.status === "failed" ? "bg-destructive/50" : "bg-border/40 group-hover:bg-primary/30"
            )} />

            {/* Header row */}
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
                    {cfg.pulse
                        ? <span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className={cn("relative inline-flex rounded-full size-2", cfg.dot)} /></span>
                        : <span className={cn("size-2 rounded-full", cfg.dot)} />
                    }
                    <Badge className={cfg.badge}>{cfg.label}</Badge>
                </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
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

            {/* Footer */}
            <div className="flex items-center justify-between">
                {ann.status === "sent" && ann.sentCount != null ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <Send className="size-3" />
                        أُرسل إلى {ann.sentCount} شخص
                    </span>
                ) : (
                    <span className="text-[11px] text-muted-foreground/60">
                        {formatDate(ann.createdAt)}
                    </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ann.status !== "sent" && (
                        <Button size="icon" variant="ghost"
                            className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                            onClick={handleExecute} title="تنفيذ الآن">
                            <Play className="size-3.5" />
                        </Button>
                    )}
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
