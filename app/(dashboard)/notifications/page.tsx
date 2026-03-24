"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Bell, PackageX, SearchX, CheckCheck, Trash2, Clock, Phone, Package, ExternalLink, X, SlidersHorizontal, User, CheckCircle2, Link2, Archive, ArchiveRestore, Search, Check, RotateCcw, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
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
    archiveNotification,
    unarchiveNotification,
} from "@/lib/actions/notifications"
import { toggleProductAvailability, addAlternativeNameToProduct, getProducts } from "@/lib/actions/inventory"

function timeAgo(date: Date | string) {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return "الآن"
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
    return `منذ ${Math.floor(diff / 86400)} ي`
}

function groupNotificationsByDate(notifications: any[]) {
    const groups: { [key: string]: any[] } = {
        "اليوم": [],
        "الأمس": [],
        "سابقاً": []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    notifications.forEach(n => {
        const d = new Date(n.createdAt)
        d.setHours(0, 0, 0, 0)

        if (d.getTime() === today.getTime()) {
            groups["اليوم"].push(n)
        } else if (d.getTime() === yesterday.getTime()) {
            groups["الأمس"].push(n)
        } else {
            groups["سابقاً"].push(n)
        }
    })

    return groups
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, unread: 0, outOfStock: 0, notFound: 0, archived: 0 })
    const [filterType, setFilterType] = useState<"all" | "out_of_stock" | "not_found">("all")
    const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all")
    const [loading, setLoading] = useState(true)
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"inbox" | "archive">("inbox")
    const [archivedNotifications, setArchivedNotifications] = useState<any[]>([])
    
    // UI states
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSelectionMode, setIsSelectionMode] = useState(false)

    // Link-product dialog state
    const [linkDialog, setLinkDialog] = useState<{ open: boolean; notifId: string; searchQuery: string } | null>(null)
    const [allProducts, setAllProducts] = useState<any[]>([])
    const [productSearch, setProductSearch] = useState("")
    const [linkingProductId, setLinkingProductId] = useState<string | null>(null)
    const [isLinking, setIsLinking] = useState(false)

    const loadData = useCallback(async () => {
        const [notifRes, archivedRes, statsRes] = await Promise.all([
            getNotifications({
                type: filterType !== "all" ? filterType as any : undefined,
                isRead: filterRead === "all" ? undefined : filterRead === "read",
                isArchived: false,
            }),
            getNotifications({ isArchived: true }),
            getNotificationStats(),
        ])
        if (notifRes.success) setNotifications(notifRes.data ?? [])
        if (archivedRes.success) setArchivedNotifications(archivedRes.data ?? [])
        if (statsRes.success && statsRes.data) setStats(statsRes.data)
        setLoading(false)
        setSelectedIds(new Set())
        setIsSelectionMode(false)
    }, [filterType, filterRead])

    useEffect(() => { loadData() }, [loadData])

    const handleArchive = async (id: string, reason: string) => {
        const res = await archiveNotification(id, reason)
        if (res.success) {
            toast.success("تم أرشفة الإشعار")
            loadData()
        }
    }

    const handleUnarchive = async (id: string) => {
        const res = await unarchiveNotification(id)
        if (res.success) {
            toast.success("تم إلغاء الأرشفة")
            loadData()
        }
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

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
        setIsSelectionMode(next.size > 0)
    }

    const selectAll = () => {
        const ids = processedNotifications.map(n => n.id)
        setSelectedIds(new Set(ids))
        setIsSelectionMode(true)
    }

    const deselectAll = () => {
        setSelectedIds(new Set())
        setIsSelectionMode(false)
    }

    const handleBulkArchive = async () => {
        if (selectedIds.size === 0) return
        const ids = Array.from(selectedIds)
        setLoading(true)
        try {
            await Promise.all(ids.map(id => archiveNotification(id, "إجراء جماعي")))
            toast.success(`تم أرشفة ${ids.length} إشعارات`)
            loadData()
        } catch (error) {
            toast.error("فشل أرشفة بعض الإشعارات")
        } finally {
            setLoading(false)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        const ids = Array.from(selectedIds)
        if (!confirm(`هل أنت متأكد من حذف ${ids.length} إشعارات؟`)) return
        setLoading(true)
        try {
            await Promise.all(ids.map(id => deleteNotification(id)))
            toast.success(`تم حذف ${ids.length} إشعارات`)
            loadData()
        } catch (error) {
            toast.error("فشل حذف بعض الإشعارات")
        } finally {
            setLoading(false)
        }
    }

    // ── Data Processing ──
    const processedNotifications = useMemo(() => {
        let items = activeTab === "inbox" ? notifications : archivedNotifications
        
        // Apply search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            items = items.filter(n => 
                n.searchQuery?.toLowerCase().includes(q) ||
                n.productName?.toLowerCase().includes(q) ||
                n.person?.name?.toLowerCase().includes(q) ||
                n.phoneNumber?.includes(q)
            )
        }
        
        return items
    }, [notifications, archivedNotifications, activeTab, searchQuery])

    const groupedNotifications = useMemo(() => {
        return groupNotificationsByDate(processedNotifications)
    }, [processedNotifications])

    // ── Quick Action: Toggle product availability ──
    const handleToggleAvailability = async (notif: any) => {
        if (!notif.product?.id || togglingId) return
        setTogglingId(notif.id)
        try {
            const res = await toggleProductAvailability(notif.product.id, notif.product.isAvailable)
            if (res.success) {
                toast.success(notif.product.isAvailable ? "تم إيقاف المنتج" : "تم تفعيل المنتج ✓")
                await archiveNotification(notif.id, "تم تفعيل المنتج")
                loadData()
            } else {
                toast.error(res.error || "فشل تحديث حالة المنتج")
            }
        } finally {
            setTogglingId(null)
        }
    }

    // ── Quick Action: Open link-product dialog ──
    const handleOpenLinkDialog = async (notif: any) => {
        setLinkDialog({ open: true, notifId: notif.id, searchQuery: notif.searchQuery })
        setProductSearch("")
        setLinkingProductId(null)
        // Load products if not loaded yet
        if (allProducts.length === 0) {
            const res = await getProducts()
            if (res.success && res.data) setAllProducts(res.data)
        }
    }

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return allProducts.slice(0, 20)
        const q = productSearch.toLowerCase()
        return allProducts.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.itemNumber?.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q)
        ).slice(0, 20)
    }, [allProducts, productSearch])

    const handleLinkProduct = async () => {
        if (!linkDialog || !linkingProductId) return
        setIsLinking(true)
        try {
            const res = await addAlternativeNameToProduct(linkingProductId, linkDialog.searchQuery)
            if (res.success) {
                toast.success(`تم إضافة "${linkDialog.searchQuery}" كتسمية بديلة`)
                await archiveNotification(linkDialog.notifId, "تم ربط التسمية")
                setLinkDialog(null)
                loadData()
            } else {
                toast.error(res.error || "فشل ربط المنتج")
            }
        } finally {
            setIsLinking(false)
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
                
                <div className="flex flex-1 max-w-md items-center relative group">
                    <Search className="absolute right-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="بحث في الإشعارات، المنتجات، أو العملاء..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pr-10 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="absolute left-3 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
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

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/40 w-fit">
                <button
                    onClick={() => setActiveTab("inbox")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                        activeTab === "inbox"
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Bell className="h-4 w-4" />
                    الإشعارات
                    {stats.total > 0 && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{stats.total}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("archive")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                        activeTab === "archive"
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Archive className="h-4 w-4" />
                    الأرشيف
                    {stats.archived > 0 && (
                        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{stats.archived}</span>
                    )}
                </button>
            </div>

            {/* Selection Bar */}
            {isSelectionMode && (
                <div className="sticky top-4 z-50 flex items-center justify-between p-3 px-6 rounded-2xl bg-primary text-primary-foreground shadow-2xl animate-in slide-in-from-top-8 duration-300">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Check className="h-5 w-5" />
                            <span className="font-bold">{selectedIds.size} محدد</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={selectAll}
                            className="text-primary-foreground hover:bg-white/10 rounded-lg text-xs"
                        >
                            تحديد الكل
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={deselectAll}
                            className="text-primary-foreground hover:bg-white/10 rounded-lg text-xs"
                        >
                            إلغاء التحديد
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeTab === "inbox" && (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleBulkArchive}
                                className="rounded-xl gap-2 h-9 font-bold bg-white text-primary hover:bg-white/90"
                            >
                                <Archive className="h-4 w-4" />
                                أرشفة المحدّد
                            </Button>
                        )}
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleBulkDelete}
                            className="rounded-xl gap-2 h-9 font-bold shadow-lg"
                        >
                            <Trash className="h-4 w-4" />
                            حذف المحدّد
                        </Button>
                    </div>
                </div>
            )}

            {/* Filters — only on inbox tab */}
            {activeTab === "inbox" && (
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
                    عرض <span className="font-bold text-foreground">{processedNotifications.length}</span> إشعار
                </span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={loadData} 
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all rotate-0 active:rotate-180"
                    disabled={loading}
                >
                    <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>
            )}

            {/* Notifications List — grouped by date */}
            {(activeTab === "inbox" || activeTab === "archive") && (
            <div className="space-y-8 pb-20">
                {loading && !processedNotifications.length ? (
                    <div className="space-y-4 animate-pulse">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-2xl bg-muted/30 border border-border/30" />
                        ))}
                    </div>
                ) : processedNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center glass-panel rounded-3xl border border-dashed border-border/50">
                        <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                            <Bell className="size-12 text-primary/20" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">لا توجد نتائج</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs px-4">
                            جرب تغيير الفلاتر أو البحث لتجد ما تبحث عنه
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedNotifications).map(([groupName, groupItems]) => (
                        groupItems.length > 0 && (
                            <div key={groupName} className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <h2 className="text-sm font-bold text-muted-foreground/80 tracking-wider uppercase">{groupName}</h2>
                                    <div className="h-px flex-1 bg-linear-to-l from-border/50 to-transparent" />
                                    <Badge variant="outline" className="text-[10px] font-bold rounded-full border-border/40 bg-muted/30">
                                        {groupItems.length}
                                    </Badge>
                                </div>
                                
                                <div className="grid gap-3">
                                    {groupItems.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => isSelectionMode && toggleSelection(notif.id)}
                                            className={cn(
                                                "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300",
                                                isSelectionMode && "cursor-pointer",
                                                selectedIds.has(notif.id) 
                                                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20 translate-x-1 shadow-lg" 
                                                    : notif.isRead
                                                        ? "bg-background/40 border-border/30 opacity-80 hover:opacity-100 hover:bg-background/60"
                                                        : "bg-background border-border/60 shadow-sm hover:shadow-md hover:border-primary/30"
                                            )}
                                        >
                                            {/* Selection Checkbox */}
                                            <div 
                                                className={cn(
                                                    "absolute -right-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-300",
                                                    isSelectionMode || selectedIds.has(notif.id) ? "opacity-100 scale-100" : "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleSelection(notif.id)
                                                }}
                                            >
                                                <div className={cn(
                                                    "size-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors",
                                                    selectedIds.has(notif.id) 
                                                        ? "bg-primary border-primary text-primary-foreground" 
                                                        : "bg-background border-border text-transparent"
                                                )}>
                                                    <Check className="h-3.5 w-3.5 stroke-4" />
                                                </div>
                                            </div>

                                            {/* Unread indicator */}
                                            {!notif.isRead && !notif.isArchived && (
                                                <div className="absolute top-4 left-4 size-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                                            )}

                                            {/* Type icon */}
                                            <div className={cn(
                                                "size-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110 duration-500",
                                                notif.type === "out_of_stock" ? "bg-amber-500/10" : "bg-red-500/10",
                                                notif.isArchived && "opacity-60"
                                            )}>
                                                {notif.type === "out_of_stock" ? (
                                                    <PackageX className="size-6 text-amber-600" />
                                                ) : (
                                                    <SearchX className="size-6 text-red-600" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    {notif.isArchived ? (
                                                        <>
                                                            <Badge variant="secondary" className="text-[10px] font-bold bg-slate-500/10 text-slate-600 border-slate-200">
                                                                <Archive className="h-3 w-3 ml-1" />
                                                                مؤرشف
                                                            </Badge>
                                                            {notif.archiveReason && (
                                                                <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 text-emerald-700 bg-emerald-50">
                                                                    <CheckCircle2 className="h-3 w-3 ml-1" />
                                                                    {notif.archiveReason}
                                                                </Badge>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                                                                notif.type === "out_of_stock"
                                                                    ? "bg-amber-500/10 text-amber-700 border-amber-200/50"
                                                                    : "bg-red-500/10 text-red-700 border-red-200/50"
                                                            )}
                                                        >
                                                            {notif.type === "out_of_stock" ? "غير متوفر" : "غير موجود"}
                                                        </Badge>
                                                    )}
                                                    <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5 font-medium">
                                                        <Clock className="h-3 w-3" />
                                                        {timeAgo(notif.createdAt)}
                                                    </span>
                                                </div>

                                                <p className={cn(
                                                    "text-[15px] font-bold mt-1 leading-tight transition-colors",
                                                    notif.isArchived ? "text-muted-foreground" : "text-foreground"
                                                )}>
                                                    بحث عن: <span className={cn("inline-block px-1.5 py-0.5 rounded bg-primary/5", !notif.isArchived && "text-primary")}>"{notif.searchQuery}"</span>
                                                </p>

                                                <div className="flex items-center gap-4 mt-3 flex-wrap">
                                                    {notif.person && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="size-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                                <User className="h-3 w-3 text-blue-600" />
                                                            </div>
                                                            <span className="text-xs font-semibold text-blue-700/80">
                                                                {notif.person.name || 'عميل غير مسمّى'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {notif.productName && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="size-5 rounded-md bg-primary/5 flex items-center justify-center">
                                                                <Package className="h-3 w-3 text-primary/70" />
                                                            </div>
                                                            <span className="text-xs font-semibold text-muted-foreground">
                                                                {notif.productName}
                                                                {notif.product && (
                                                                    <Link
                                                                        href={`/inventory/${notif.product.id}`}
                                                                        className="text-primary hover:underline mr-1.5"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink className="h-3 w-3 inline" />
                                                                    </Link>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {notif.phoneNumber && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="size-5 rounded-full bg-slate-500/10 flex items-center justify-center">
                                                                <Phone className="h-3 w-3 text-slate-600" />
                                                            </div>
                                                            <span className="text-xs font-mono text-muted-foreground/80" dir="ltr">{notif.phoneNumber}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ── Quick Action Buttons (Inbox only) ── */}
                                                {!notif.isArchived && (
                                                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                                                        {notif.type === "out_of_stock" && notif.product && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={cn(
                                                                    "h-8 text-[11px] rounded-xl gap-2 font-bold transition-all shadow-xs border-dashed",
                                                                    notif.product.isAvailable
                                                                        ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                                                                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:scale-95"
                                                                )}
                                                                disabled={togglingId === notif.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleToggleAvailability(notif)
                                                                }}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                {notif.product.isAvailable ? "إيقاف المنتج" : "تفعيل المنتج"}
                                                            </Button>
                                                        )}
                                                        {notif.type === "not_found" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-[11px] rounded-xl gap-2 font-bold border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 transition-all active:scale-95 shadow-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleOpenLinkDialog(notif)
                                                                }}
                                                            >
                                                                <Link2 className="h-3.5 w-3.5" />
                                                                ربط بمنتج
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 self-center">
                                                {!notif.isArchived && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-9 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 shadow-xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleArchive(notif.id, "تم القراءة")
                                                        }}
                                                        title="أرشفة (تم القراءة)"
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {notif.isArchived && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-9 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleUnarchive(notif.id)
                                                        }}
                                                        title="إلغاء الأرشفة"
                                                    >
                                                        <ArchiveRestore className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-9 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDelete(notif.id)
                                                    }}
                                                    title="حذف"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))
                )}
            </div>
            )}



            {/* ── Link Product Dialog ── */}
            <Dialog open={!!linkDialog?.open} onOpenChange={(open) => !open && setLinkDialog(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">ربط التسمية بمنتج</DialogTitle>
                        <DialogDescription className="text-sm">
                            الزبون بحث عن <span className="font-bold text-primary">"{linkDialog?.searchQuery}"</span>.
                            اختر المنتج الصحيح لإضافة هذه التسمية كاسم بديل.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <Input
                            placeholder="ابحث عن منتج بالاسم أو الرقم..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            className="rounded-xl"
                        />

                        <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border/50 p-1">
                            {filteredProducts.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
                            ) : (
                                filteredProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => setLinkingProductId(product.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2.5 rounded-lg text-right transition-all text-sm",
                                            linkingProductId === product.id
                                                ? "bg-primary/10 border border-primary/30 shadow-sm"
                                                : "hover:bg-muted/50"
                                        )}
                                    >
                                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate text-xs">{product.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{product.itemNumber}</p>
                                        </div>
                                        {linkingProductId === product.id && (
                                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setLinkDialog(null)} className="rounded-xl">
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleLinkProduct}
                            disabled={!linkingProductId || isLinking}
                            className="rounded-xl gap-2"
                        >
                            <Link2 className="h-4 w-4" />
                            {isLinking ? "جاري الربط..." : "ربط وإضافة التسمية"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
