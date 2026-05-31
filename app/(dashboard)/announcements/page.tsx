"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
    Plus, Megaphone, Send, FileText, AlertCircle,
    Search, LayoutGrid, List, Users, TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { QuickCreateDialog } from "@/components/announcements/quick-create-dialog"
import { AnnouncementCard }  from "@/components/announcements/announcement-card"
import { getAnnouncements }  from "@/lib/actions/announcements"
import { useRouter }         from "next/navigation"
import { cn }                from "@/lib/utils"
import type { AnnouncementRow } from "@/components/announcements/announcement-columns"

// ─── Filter Chip ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
    { key: "all",     label: "الكل",          color: "bg-muted text-muted-foreground" },
    { key: "pending", label: "مسودة",          color: "bg-muted/80 text-muted-foreground" },
    { key: "queued",  label: "في الطابور",    color: "bg-indigo-500/10 text-indigo-600" },
    { key: "sent",    label: "تم الإرسال",   color: "bg-emerald-500/10 text-emerald-600" },
    { key: "failed",  label: "فشل",           color: "bg-destructive/10 text-destructive" },
] as const

type FilterKey = typeof STATUS_FILTERS[number]["key"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
    const router = useRouter()
    const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])
    const [dialogOpen,    setDialogOpen]    = useState(false)
    const [loading,       setLoading]       = useState(true)
    const [search,        setSearch]        = useState("")
    const [filter,        setFilter]        = useState<FilterKey>("all")
    const [viewMode,      setViewMode]      = useState<"grid" | "list">("grid")

    const loadAnnouncements = useCallback(async () => {
        const res = await getAnnouncements()
        if (res.success && res.data) setAnnouncements(res.data as AnnouncementRow[])
        setLoading(false)
    }, [])

    useEffect(() => {
        loadAnnouncements()
        window.addEventListener("refresh-announcements", loadAnnouncements)
        return () => window.removeEventListener("refresh-announcements", loadAnnouncements)
    }, [loadAnnouncements])

    const handleCreated = async (id: string) => {
        router.push(`/announcements/${id}`)
    }

    // ── Derived stats ─────────────────────────────────────────────────────────
    const sent      = announcements.filter(a => a.status === "sent")
    const failed    = announcements.filter(a => a.status === "failed")
    const drafts    = announcements.filter(a => a.status === "pending")
    const active    = announcements.filter(a => ["queued", "queueing"].includes(a.status))

    const totalReached = sent.length  // We no longer store sentCount — each sent row is one customer
    const successRate  = sent.length > 0
        ? Math.round((sent.length / (sent.length + failed.length || 1)) * 100)
        : 0

    const STATS = [
        {
            label: "إجمالي الإعلانات",
            value: announcements.length,
            icon:  Megaphone,
            color: "text-primary",
            bg:    "bg-primary/10",
            sub:   `${active.length} نشط`,
        },
        {
            label: "تم الإرسال",
            value: sent.length,
            icon:  Send,
            color: "text-emerald-600",
            bg:    "bg-emerald-500/10",
            sub:   `${successRate}% نجاح`,
        },
        {
            label: "إجمالي الوصول",
            value: totalReached.toLocaleString("ar"),
            icon:  Users,
            color: "text-indigo-600",
            bg:    "bg-indigo-500/10",
            sub:   "عميل وصلتهم الرسائل",
        },
        {
            label: "مسودات",
            value: drafts.length,
            icon:  FileText,
            color: "text-muted-foreground",
            bg:    "bg-muted/60",
            sub:   `${failed.length} فشل`,
        },
    ]

    // ── Filtering ─────────────────────────────────────────────────────────────
    const counts: Record<string, number> = useMemo(() => {
        const c: Record<string, number> = { all: announcements.length }
        for (const a of announcements) c[a.status] = (c[a.status] ?? 0) + 1
        return c
    }, [announcements])

    const filtered = useMemo(() => {
        let list = announcements
        if (filter !== "all") list = list.filter(a => a.status === filter)
        if (search.trim()) {
            const q = search.trim().toLowerCase()
            list = list.filter(a => a.title.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q))
        }
        return list
    }, [announcements, filter, search])

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        الإعلانات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        أنشئ وأدِر إعلانات موجّهة للعملاء والمنتجات
                    </p>
                </div>
                <Button
                    onClick={() => setDialogOpen(true)}
                    className="gap-2 rounded-xl shadow-lg shadow-primary/20 font-bold"
                >
                    <Plus className="size-4" />
                    إعلان جديد
                </Button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map(({ label, value, icon: Icon, color, bg, sub }) => (
                    <div key={label} className="glass-panel rounded-2xl border border-border/50 p-5 flex items-center gap-4">
                        <div className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", bg)}>
                            <Icon className={cn("size-5", color)} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-black">{value}</p>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn("text-[10px] font-semibold mt-0.5", color)}>{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Toolbar: Search + Filter + View ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ابحث عن إعلان..."
                        className="pr-9 rounded-xl h-10"
                    />
                </div>

                {/* View toggle */}
                <div className="flex rounded-xl border border-border/60 overflow-hidden h-10 shrink-0">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                            "px-3 flex items-center transition-all",
                            viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted/40 text-muted-foreground"
                        )}
                        title="عرض شبكة"
                    >
                        <LayoutGrid className="size-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                            "px-3 flex items-center border-r border-border/60 transition-all",
                            viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted/40 text-muted-foreground"
                        )}
                        title="عرض قائمة"
                    >
                        <List className="size-4" />
                    </button>
                </div>
            </div>

            {/* ── Status Filter Chips ── */}
            <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(({ key, label, color }) => {
                    const count = counts[key] ?? 0
                    if (key !== "all" && count === 0) return null
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200",
                                filter === key
                                    ? cn(color, "border-current/30 shadow-sm")
                                    : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40"
                            )}
                        >
                            {label}
                            <span className={cn(
                                "min-w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black px-1",
                                filter === key ? "bg-current/10" : "bg-muted"
                            )}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* ── Cards ── */}
            {loading ? (
                <div className={cn(
                    "grid gap-4",
                    viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                )}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-panel rounded-2xl border border-border/30 p-5 h-44 animate-pulse">
                            <div className="h-4 w-2/3 bg-muted/50 rounded-lg mb-3" />
                            <div className="h-3 w-full bg-muted/30 rounded mb-1" />
                            <div className="h-3 w-4/5 bg-muted/30 rounded" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-2xl border border-border/50">
                    {search || filter !== "all" ? (
                        <>
                            <Search className="size-10 text-muted-foreground/30 mb-3" />
                            <h3 className="text-base font-bold mb-1">لا توجد نتائج</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                جرّب تغيير مصطلح البحث أو الفلتر
                            </p>
                            <Button variant="outline" size="sm" className="rounded-xl"
                                onClick={() => { setSearch(""); setFilter("all") }}>
                                مسح الفلتر
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                <Megaphone className="size-8 text-primary/60" />
                            </div>
                            <h3 className="text-lg font-bold mb-1">لا توجد إعلانات بعد</h3>
                            <p className="text-sm text-muted-foreground mb-5">أنشئ أول إعلان الآن وابدأ التواصل مع جمهورك</p>
                            <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                                <Plus className="size-4" />
                                إنشاء الإعلان الأول
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className={cn(
                    "grid gap-4",
                    viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 max-w-3xl"
                )}>
                    {filtered.map(ann => (
                        <AnnouncementCard
                            key={ann.id}
                            announcement={ann}
                            compact={viewMode === "list"}
                            onRefresh={loadAnnouncements}
                        />
                    ))}
                </div>
            )}

            {/* ── Quick Create ── */}
            <QuickCreateDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleCreated}
            />
        </div>
    )
}
