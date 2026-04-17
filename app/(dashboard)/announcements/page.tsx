"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Megaphone, Send, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuickCreateDialog } from "@/components/announcements/quick-create-dialog"
import { AnnouncementCard } from "@/components/announcements/announcement-card"
import { getAnnouncements } from "@/lib/actions/announcements"
import { useRouter } from "next/navigation"
import type { AnnouncementRow } from "@/components/announcements/announcement-columns"



export default function AnnouncementsPage() {
    const router = useRouter()
    const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [loading, setLoading] = useState(true)

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

    /** After quick-create, navigate to the new announcement's detail page */
    const handleCreated = async (id: string) => {
        router.push(`/announcements/${id}`)
    }

    // Stats
    const total  = announcements.length
    const sent   = announcements.filter(a => a.status === "sent").length
    const drafts = announcements.filter(a => a.status === "draft").length
    const failed = announcements.filter(a => a.status === "failed").length

    const STATS = [
        { label: "إجمالي الإعلانات", value: total,  icon: Megaphone,   color: "text-primary",         bg: "bg-primary/10"     },
        { label: "تم الإرسال",       value: sent,   icon: Send,        color: "text-emerald-600",      bg: "bg-emerald-500/10" },
        { label: "مسودات",           value: drafts, icon: FileText,    color: "text-muted-foreground", bg: "bg-muted/60"       },
        { label: "فشلت",             value: failed, icon: AlertCircle, color: "text-destructive",      bg: "bg-destructive/10" },
    ]

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        الإعلانات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        أنشئ وأدِر إعلانات موجّهة للأشخاص والمنتجات
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

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="glass-panel rounded-2xl border border-border/50 p-5 flex items-center gap-4">
                        <div className={`size-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-black">{value}</p>
                            <p className="text-xs text-muted-foreground">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-panel rounded-2xl border border-border/30 p-5 h-44 animate-pulse">
                            <div className="h-4 w-2/3 bg-muted/50 rounded-lg mb-3" />
                            <div className="h-3 w-full bg-muted/30 rounded mb-1" />
                            <div className="h-3 w-4/5 bg-muted/30 rounded" />
                        </div>
                    ))}
                </div>
            ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-2xl border border-border/50">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Megaphone className="size-8 text-primary/60" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">لا توجد إعلانات بعد</h3>
                    <p className="text-sm text-muted-foreground mb-5">أنشئ أول إعلان الآن وابدأ التواصل مع جمهورك</p>
                    <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                        <Plus className="size-4" />
                        إنشاء الإعلان الأول
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {announcements.map(ann => (
                        <AnnouncementCard
                            key={ann.id}
                            announcement={ann}
                            onRefresh={loadAnnouncements}
                        />
                    ))}
                </div>
            )}

            {/* Quick Create Dialog (Step 1 — navigates to detail page after) */}
            <QuickCreateDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleCreated}
            />
        </div>
    )
}
