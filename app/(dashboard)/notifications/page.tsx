"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, PackageX, SearchX, CheckCheck, Trash2, Clock, Phone, Package, ExternalLink, X, SlidersHorizontal, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    getNotifications,
    getNotificationStats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
} from "@/lib/actions/notifications"

function timeAgo(date: Date | string) {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return "الآن"
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
    return `منذ ${Math.floor(diff / 86400)} ي`
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, unread: 0, outOfStock: 0, notFound: 0 })
    const [filterType, setFilterType] = useState<"all" | "out_of_stock" | "not_found">("all")
    const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all")
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        const [notifRes, statsRes] = await Promise.all([
            getNotifications({
                type: filterType !== "all" ? filterType as any : undefined,
                isRead: filterRead === "all" ? undefined : filterRead === "read",
            }),
            getNotificationStats(),
        ])
        if (notifRes.success) setNotifications(notifRes.data ?? [])
        if (statsRes.success && statsRes.data) setStats(statsRes.data)
        setLoading(false)
    }, [filterType, filterRead])

    useEffect(() => { loadData() }, [loadData])

    const handleMarkAsRead = async (id: string) => {
        const res = await markAsRead(id)
        if (res.success) loadData()
    }

    const handleMarkAllRead = async () => {
        const res = await markAllAsRead()
        if (res.success) {
            toast.success("تم تعيين الكل مقروء")
            loadData()
        }
    }

    const handleDelete = async (id: string) => {
        const res = await deleteNotification(id)
        if (res.success) {
            toast.success("تم حذف الإشعار")
            loadData()
        }
    }

    const handleClearOld = async () => {
        const res = await clearOldNotifications(30)
        if (res.success) {
            toast.success(`تم حذف ${(res.data as any)?.deleted ?? 0} إشعار قديم`)
            loadData()
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Bell className="h-8 w-8 text-primary" />
                        إشعارات الذكاء الاصطناعي
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        تنبيهات تلقائية من بحث الزبائن عبر البوت
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {stats.unread > 0 && (
                        <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2 rounded-xl">
                            <CheckCheck className="h-4 w-4" />
                            تعيين الكل مقروء
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleClearOld} className="gap-2 rounded-xl text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        مسح القديم
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="glass-panel rounded-xl p-5 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">إجمالي الإشعارات</p>
                            <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                        </div>
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Bell className="size-5 text-primary" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-5 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">غير مقروء</p>
                            <h3 className="text-2xl font-bold mt-1 text-red-600">{stats.unread}</h3>
                        </div>
                        <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Bell className="size-5 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-5 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">غير متوفر</p>
                            <h3 className="text-2xl font-bold mt-1 text-amber-600">{stats.outOfStock}</h3>
                        </div>
                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <PackageX className="size-5 text-amber-600" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-5 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">غير موجود</p>
                            <h3 className="text-2xl font-bold mt-1 text-red-600">{stats.notFound}</h3>
                        </div>
                        <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <SearchX className="size-5 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/50 bg-muted/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    فلاتر:
                </div>
                <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
                    <SelectTrigger className={cn(
                        "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[130px]",
                        filterType !== "all" && "border-primary/50 bg-primary/5 text-primary"
                    )}>
                        <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-xs rounded-lg">كل الأنواع</SelectItem>
                        <SelectItem value="out_of_stock" className="text-xs rounded-lg">🟡 غير متوفر</SelectItem>
                        <SelectItem value="not_found" className="text-xs rounded-lg">🔴 غير موجود</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterRead} onValueChange={v => setFilterRead(v as any)}>
                    <SelectTrigger className={cn(
                        "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[120px]",
                        filterRead !== "all" && "border-primary/50 bg-primary/5 text-primary"
                    )}>
                        <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-xs rounded-lg">الكل</SelectItem>
                        <SelectItem value="unread" className="text-xs rounded-lg">غير مقروء</SelectItem>
                        <SelectItem value="read" className="text-xs rounded-lg">مقروء</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground mr-auto">
                    عرض <span className="font-bold text-foreground">{notifications.length}</span> إشعار
                </span>
            </div>

            {/* Notifications List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="space-y-2 animate-pulse">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-muted/30 border border-border/30" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                            <Bell className="size-10 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">لا توجد إشعارات</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                            ستظهر هنا تنبيهات عندما يبحث الزبائن عن منتجات غير متوفرة أو غير موجودة
                        </p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={cn(
                                "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200",
                                notif.isRead
                                    ? "bg-background/50 border-border/30 opacity-70 hover:opacity-100"
                                    : "bg-background border-border/50 shadow-sm hover:shadow-md"
                            )}
                        >
                            {/* Unread indicator */}
                            {!notif.isRead && (
                                <div className="absolute top-4 left-4 size-2 rounded-full bg-primary animate-pulse" />
                            )}

                            {/* Type icon */}
                            <div className={cn(
                                "size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                notif.type === "out_of_stock"
                                    ? "bg-amber-500/10"
                                    : "bg-red-500/10"
                            )}>
                                {notif.type === "out_of_stock" ? (
                                    <PackageX className="size-5 text-amber-600" />
                                ) : (
                                    <SearchX className="size-5 text-red-600" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "text-[10px] font-bold",
                                            notif.type === "out_of_stock"
                                                ? "bg-amber-500/10 text-amber-700 border-amber-200"
                                                : "bg-red-500/10 text-red-700 border-red-200"
                                        )}
                                    >
                                        {notif.type === "out_of_stock" ? "غير متوفر" : "غير موجود"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {timeAgo(notif.createdAt)}
                                    </span>
                                </div>

                                <p className="text-sm font-semibold mt-1.5">
                                    بحث عن: <span className="text-primary font-bold">"{notif.searchQuery}"</span>
                                </p>

                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {notif.person && (
                                        <Link
                                            href={`/persons`}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <User className="h-3 w-3" />
                                            {notif.person.name || 'عميل غير مسمّى'}
                                        </Link>
                                    )}
                                    {notif.productName && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            {notif.productName}
                                            {notif.product && (
                                                <Link
                                                    href={`/inventory/${notif.product.id}`}
                                                    className="text-primary hover:underline mr-1"
                                                >
                                                    <ExternalLink className="h-3 w-3 inline" />
                                                </Link>
                                            )}
                                        </span>
                                    )}
                                    {notif.phoneNumber && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span className="font-mono" dir="ltr">{notif.phoneNumber}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {!notif.isRead && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full text-primary hover:bg-primary/10"
                                        onClick={() => handleMarkAsRead(notif.id)}
                                        title="تعيين مقروء"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(notif.id)}
                                    title="حذف"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
