"use client"
/**
 * app/(dashboard)/announcements/[id]/analytics/page.tsx
 *
 * Analytics Dashboard — KPIs + fail reasons breakdown.
 * Sourced entirely from AnnouncementLog via getAnnouncementLogStats.
 */
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    ArrowRight, Loader2, BarChart2, CheckCircle2,
    XCircle, Users, TrendingUp, AlertTriangle, History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import { cn }     from "@/lib/utils"
import { getAnnouncementProgress, getAnnouncementMessages, getAnnouncement } from "@/lib/actions/announcements"
// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
    label, value, sub, icon: Icon, color, bg,
}: {
    label: string; value: string | number; sub?: string
    icon: React.ComponentType<any>; color: string; bg: string
}) {
    return (
        <div className="glass-panel rounded-2xl border border-border/50 p-5 flex items-start gap-4">
            <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("size-5", color)} />
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className={cn("text-2xl font-black mt-0.5", color)}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}
// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function FailReasonBar({ reason, count, max }: { reason: string; count: number; max: number }) {
    const pct = max > 0 ? (count / max) * 100 : 0
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground truncate max-w-48">{reason}</span>
                <span className="font-black text-destructive">{count}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full bg-destructive/60 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}
// ─── Hourly Timeline ──────────────────────────────────────────────────────────
interface HourBucket { hour: string; sent: number; failed: number }
function buildTimeline(items: any[]): HourBucket[] {
    const map = new Map<string, { sent: number; failed: number }>()
    for (const r of items) {
        const h = new Date(r.sentAt).toLocaleString("ar-SA", { hour: "numeric", hour12: true })
        if (!map.has(h)) map.set(h, { sent: 0, failed: 0 })
        const b = map.get(h)!
        r.status === "sent" ? b.sent++ : b.failed++
    }
    return Array.from(map.entries()).map(([hour, v]) => ({ hour, ...v }))
}
function TimelineChart({ buckets }: { buckets: HourBucket[] }) {
    if (buckets.length === 0) return null
    const maxVal = Math.max(...buckets.map(b => b.sent + b.failed), 1)
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                التوزيع الزمني للإرسال
            </h3>
            <div className="flex items-end gap-1 h-24">
                {buckets.map((b, i) => {
                    const total   = b.sent + b.failed
                    const sentPct = (total / maxVal) * 100
                    const failPct = b.failed / maxVal * 100
                    return (
                        <div key={i} className="flex-1 flex flex-col justify-end gap-px group relative" title={`${b.hour}: ${total} رسالة`}>
                            <div
                                className="bg-destructive/50 rounded-sm transition-all"
                                style={{ height: `${failPct}%` }}
                            />
                            <div
                                className="bg-emerald-500/60 rounded-sm transition-all"
                                style={{ height: `${(sentPct - failPct)}%` }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                                <div className="bg-popover border border-border/50 rounded-lg px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
                                    <p className="font-bold">{b.hour}</p>
                                    <p className="text-emerald-600">✓ {b.sent}</p>
                                    {b.failed > 0 && <p className="text-destructive">✗ {b.failed}</p>}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-emerald-500/60 inline-block" />
                    نجح
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-destructive/50 inline-block" />
                    فشل
                </span>
            </div>
        </div>
    )
}
// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnnouncementAnalyticsPage() {
    const { id }  = useParams<{ id: string }>()
    const router  = useRouter()
    const [title,    setTitle]    = useState("")
    const [stats,    setStats]    = useState<any>(null)
    const [timeline, setTimeline] = useState<HourBucket[]>([])
    const [topFail,  setTopFail]  = useState<any[]>([])
    const [loading,  setLoading]  = useState(true)
    useEffect(() => {
        Promise.all([
            getAnnouncement(id),
            getAnnouncementProgress(id),
            getAnnouncementMessages(id, 1, 500),
        ]).then(([annRes, statsRes, logsRes]) => {
            if (annRes.success)   setTitle((annRes.data as any)?.title ?? "")
            if (statsRes.success) setStats(statsRes.data)
            if (logsRes.success) {
                const allItems = ((logsRes.data as any)?.messages ?? []).map((m: any) => ({
                    id:           m.id,
                    customerId:     m.customerId,
                    customerName:   m.customerName,
                    whatsapp:     m.whatsappNumber,
                    status:       m.status,
                    failReason:   m.errorReason,
                    sentAt:       m.sentAt ?? m.queuedAt,
                }))
                setTimeline(buildTimeline(allItems))
                // Top failed contacts
                const failedItems = allItems.filter((r: any) => r.status === "failed")
                const map = new Map<string, { name: string; count: number; reason: string }>()
                for (const r of failedItems) {
                    const key = r.whatsapp ?? r.customerId ?? "?"
                    if (!map.has(key)) map.set(key, { name: r.customerName ?? "—", count: 0, reason: r.failReason ?? "—" })
                    map.get(key)!.count++
                }
                setTopFail(Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10))
            }
            setLoading(false)
        })
    }, [id])
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }
    const successRate = stats?.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0
    const failRate    = stats?.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0
    const maxReason   = stats?.byReason?.[0]?.count ?? 1
    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon"
                    onClick={() => router.push(`/announcements/${id}`)}
                    className="size-9 rounded-xl shrink-0">
                    <ArrowRight className="size-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-black truncate">تحليل الأداء</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{title}</p>
                </div>
                <Button variant="outline" size="sm"
                    onClick={() => router.push(`/announcements/${id}/logs`)}
                    className="gap-2 rounded-xl text-xs">
                    <History className="size-3.5" />
                    سجل الإرسال
                </Button>
            </div>
            {/* Data missing notice */}
            {(!stats || stats.total === 0) && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700">
                        لا توجد بيانات بعد — يظهر التحليل بعد إرسال الإعلان وتلقّي callbacks من n8n.
                    </p>
                </div>
            )}
            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-2 gap-3">
                    <KpiCard
                        label="إجمالي الرسائل"
                        value={stats.total}
                        sub="تم الإرسال لهم"
                        icon={Users}
                        color="text-primary"
                        bg="bg-primary/10"
                    />
                    <KpiCard
                        label="معدل النجاح"
                        value={`${successRate}%`}
                        sub={`${stats.sent} رسالة وصلت`}
                        icon={TrendingUp}
                        color="text-emerald-600"
                        bg="bg-emerald-500/10"
                    />
                    <KpiCard
                        label="نجح"
                        value={stats.sent}
                        icon={CheckCircle2}
                        color="text-emerald-600"
                        bg="bg-emerald-500/10"
                    />
                    <KpiCard
                        label="فشل"
                        value={stats.failed}
                        sub={failRate > 0 ? `${failRate}% من الإجمالي` : undefined}
                        icon={XCircle}
                        color="text-destructive"
                        bg="bg-destructive/10"
                    />
                </div>
            )}
            {/* Timeline */}
            {timeline.length > 0 && (
                <div className="glass-panel rounded-2xl border border-border/50 p-5">
                    <TimelineChart buckets={timeline} />
                </div>
            )}
            {/* Fail reasons */}
            {stats?.byReason?.length > 0 && (
                <div className="glass-panel rounded-2xl border border-border/50 p-5 space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        أسباب الفشل
                    </h3>
                    <div className="space-y-3">
                        {stats.byReason.map((r: any) => (
                            <FailReasonBar key={r.reason} reason={r.reason} count={r.count} max={maxReason} />
                        ))}
                    </div>
                </div>
            )}
            {/* Top failed */}
            {topFail.length > 0 && (
                <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/30">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            أكثر جهات الاتصال فشلاً
                        </h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-muted/20">
                            <tr>
                                <th className="text-right px-4 py-2 text-xs font-bold text-muted-foreground">الاسم</th>
                                <th className="text-right px-4 py-2 text-xs font-bold text-muted-foreground">السبب</th>
                                <th className="text-right px-4 py-2 text-xs font-bold text-muted-foreground">عدد المرات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topFail.map((r, i) => (
                                <tr key={i} className="border-t border-border/30">
                                    <td className="px-4 py-2.5 font-semibold text-xs">{r.name}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.reason}</td>
                                    <td className="px-4 py-2.5">
                                        <Badge variant="destructive" className="text-xs">{r.count}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
