"use client"

/**
 * app/(dashboard)/announcements/[id]/logs/page.tsx
 *
 * Send History — full log of every message delivery attempt.
 * Sourced from AnnouncementLog written by n8n callback.
 */

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    ArrowRight, CheckCircle2, XCircle, Loader2,
    Phone, User, Search, Filter, Download,
    RefreshCw, Clock,
} from "lucide-react"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Badge }   from "@/components/ui/badge"
import { cn }      from "@/lib/utils"
import { toast }   from "sonner"
import { getAnnouncementMessages, getAnnouncementProgress, getAnnouncement } from "@/lib/actions/announcements"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
    id:           string
    personId:     string | null
    personName:   string | null
    whatsapp:     string | null
    status:       string
    failReason:   string | null
    retryCount:   number
    messageIndex: number
    sentAt:       string | Date
}

type FilterStatus = "all" | "sent" | "failed"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: string | Date) {
    return new Date(d).toLocaleString("ar-SA", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

function exportCSV(items: LogEntry[], title: string) {
    const header = "الاسم,رقم الواتساب,الحالة,سبب الفشل,الوقت,رقم الرسالة"
    const rows = items.map(r =>
        [
            r.personName ?? "—",
            r.whatsapp   ?? "—",
            r.status === "sent" ? "نجح" : "فشل",
            r.failReason ?? "",
            new Date(r.sentAt).toLocaleString("ar-SA"),
            r.messageIndex,
        ].join(",")
    )
    const csv  = [header, ...rows].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `${title}-logs.csv`; a.click()
    URL.revokeObjectURL(url)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementLogsPage() {
    const { id }   = useParams<{ id: string }>()
    const router   = useRouter()

    const [title,    setTitle]    = useState<string>("")
    const [items,    setItems]    = useState<LogEntry[]>([])
    const [stats,    setStats]    = useState<{ sent: number; failed: number; total: number; pending: number } | null>(null)
    const [loading,  setLoading]  = useState(true)
    const [filter,   setFilter]   = useState<FilterStatus>("all")
    const [search,   setSearch]   = useState("")
    const [page,     setPage]     = useState(1)
    const [total,    setTotal]    = useState(0)
    const PAGE_SIZE = 50

    const load = useCallback(async (f: FilterStatus, p: number) => {
        setLoading(true)
        const statusFilter = f === "all" ? undefined : f
        const [logsRes, statsRes] = await Promise.all([
            getAnnouncementMessages(id, p, PAGE_SIZE, statusFilter),
            getAnnouncementProgress(id),
        ])
        if (logsRes.success && logsRes.data) {
            const d = logsRes.data as any
            setItems((d.messages ?? []).map((m: any) => ({
                id:           m.id,
                personId:     m.personId,
                personName:   m.personName,
                whatsapp:     m.whatsappNumber,
                status:       m.status,
                failReason:   m.errorReason,
                retryCount:   m.retryCount,
                messageIndex: m.messageIndex,
                sentAt:       m.sentAt ?? m.queuedAt,
            })))
            setTotal(d.total ?? 0)
        }
        if (statsRes.success && statsRes.data) {
            const s = statsRes.data as any
            setStats({ total: s.totalMessages, sent: s.successCount, failed: s.failCount, pending: s.pendingCount })
        }
        setLoading(false)
    }, [id])

    useEffect(() => {
        getAnnouncement(id).then(res => {
            if (res.success && res.data) setTitle((res.data as any).title ?? "")
        })
        load("all", 1)
    }, [id, load])

    const handleFilter = (f: FilterStatus) => {
        setFilter(f); setPage(1); load(f, 1)
    }

    // Client-side search filter
    const displayed = search
        ? items.filter(r =>
            (r.personName ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (r.whatsapp   ?? "").includes(search)
        )
        : items

    const successRate = stats && stats.total > 0
        ? Math.round((stats.sent / stats.total) * 100)
        : 0

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-16">

            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/announcements/${id}`)}
                    className="size-9 rounded-xl shrink-0">
                    <ArrowRight className="size-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-black truncate">سجل الإرسال</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{title}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => load(filter, page)}
                    className="gap-2 rounded-xl">
                    <RefreshCw className="size-3.5" />
                    تحديث
                </Button>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-panel rounded-2xl border border-border/50 p-4 text-center">
                        <p className="text-2xl font-black">{stats.total}</p>
                        <p className="text-xs text-muted-foreground mt-1">إجمالي</p>
                    </div>
                    <div className="glass-panel rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                        <p className="text-2xl font-black text-emerald-600">{stats.sent}</p>
                        <p className="text-xs text-emerald-600/80 mt-1">نجح · {successRate}%</p>
                    </div>
                    <div className="glass-panel rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                        <p className="text-2xl font-black text-destructive">{stats.failed}</p>
                        <p className="text-xs text-destructive/80 mt-1">فشل</p>
                    </div>
                </div>
            )}




            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="ابحث باسم أو رقم..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pr-9 h-9 rounded-xl text-sm"
                    />
                </div>

                <div className="flex rounded-xl border border-border/50 overflow-hidden">
                    {(["all", "sent", "failed"] as FilterStatus[]).map(f => (
                        <button key={f} type="button"
                            onClick={() => handleFilter(f)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-bold transition-all",
                                filter === f
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted/50 text-muted-foreground"
                            )}>
                            {f === "all" ? "الكل" : f === "sent" ? "نجح" : "فشل"}
                            {stats && (
                                <span className="mr-1 opacity-60">
                                    ({f === "all" ? stats.total : f === "sent" ? stats.sent : stats.failed})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <Button variant="outline" size="sm"
                    onClick={() => exportCSV(displayed, title)}
                    className="gap-2 rounded-xl h-9"
                    disabled={displayed.length === 0}>
                    <Download className="size-3.5" />
                    تصدير CSV
                </Button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <Filter className="size-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-semibold">لا توجد نتائج</p>
                        <p className="text-xs mt-1">جرّب تغيير الفلتر أو البحث</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border/50 bg-muted/20">
                            <tr>
                                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">#</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الاسم</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الواتساب</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الحالة</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">السبب</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الوقت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((r, i) => (
                                <tr key={r.id}
                                    className={cn(
                                        "border-b border-border/30 transition-colors hover:bg-muted/20",
                                        i % 2 === 0 ? "" : "bg-muted/10"
                                    )}>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.messageIndex || i + 1}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <User className="size-3.5 text-muted-foreground shrink-0" />
                                            <span className="font-semibold truncate max-w-32">{r.personName ?? "—"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Phone className="size-3.5 shrink-0" />
                                            <span className="text-xs font-mono">{r.whatsapp ?? "—"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.status === "sent" ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                                <CheckCircle2 className="size-3.5" /> نجح
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive">
                                                <XCircle className="size-3.5" /> فشل
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.failReason ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="size-3 shrink-0" />
                                            {formatTime(r.sentAt)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
                        <span>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} من {total}</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 rounded-lg"
                                disabled={page === 1}
                                onClick={() => { const p = page - 1; setPage(p); load(filter, p) }}>
                                السابق
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 rounded-lg"
                                disabled={page * PAGE_SIZE >= total}
                                onClick={() => { const p = page + 1; setPage(p); load(filter, p) }}>
                                التالي
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
