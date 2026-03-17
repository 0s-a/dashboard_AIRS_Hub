"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
    Bell, 
    ChevronLeft, 
    Home, 
    User, 
    Settings, 
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    Menu,
    Wand2,
    PanelRightClose,
    PanelRightOpen,
    PackageX,
    SearchX,
    CheckCheck,
    ExternalLink,
    Clock,
} from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Button } from "@/components/ui/button"
import { CommandPalette } from "@/components/command-palette"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { navigationGroups } from "@/lib/navigation"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/actions/notifications"
import { cn } from "@/lib/utils"

interface HeaderProps {
    isCollapsed: boolean
    toggleSidebar: () => void
}

const routeMap: Record<string, string> = {
    "/": "لوحة التحكم",
    "/inventory": "المخزون",
    "/categories": "التصنيفات",
    "/persons": "الأشخاص",
    "/person-types": "أنواع الأشخاص",
    "/price-labels": "مسميات التسعيرات",
    "/currencies": "العملات",
    "/gallery": "معرض الصور",
    "/orders": "الطلبات",
    "/notifications": "الإشعارات",
}

function timeAgo(date: Date | string) {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return "الآن"
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
    return `منذ ${Math.floor(diff / 86400)} ي`
}

export function Header({ isCollapsed, toggleSidebar }: HeaderProps) {
    const pathname = usePathname()
    const [unreadCount, setUnreadCount] = useState(0)
    const [recentNotifs, setRecentNotifs] = useState<any[]>([])

    const loadNotifications = useCallback(async () => {
        const [countRes, notifsRes] = await Promise.all([
            getUnreadCount(),
            getNotifications({ limit: 5 }),
        ])
        if (countRes.success && countRes.data !== undefined) setUnreadCount(countRes.data as number)
        if (notifsRes.success && notifsRes.data) setRecentNotifs(notifsRes.data)
    }, [])

    useEffect(() => {
        loadNotifications()
        // Poll every 30 seconds
        const interval = setInterval(loadNotifications, 30000)
        return () => clearInterval(interval)
    }, [loadNotifications])

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        loadNotifications()
    }
    
    // Build breadcrumbs from the URL pathname
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs = segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join("/")}`
        return {
            label: routeMap[url] || segment,
            href: url,
        }
    })

    const currentPageTitle = routeMap[pathname] || "لوحة التحكم"

    return (
        <header className="sticky top-0 z-30 border-b glass-panel backdrop-blur-xl bg-background/60">
            <div className="flex h-16 items-center justify-between gap-5 px-6 sm:px-8">
                
                {/* ======== RIGHT SIDE: Mobile menu + Page title ======== */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Sidebar Toggle - desktop only */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="hidden sm:inline-flex h-9 w-9 rounded-xl hover:bg-primary/5 transition-colors group"
                        title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
                    >
                        {isCollapsed ? (
                            <PanelRightOpen className="size-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                        ) : (
                            <PanelRightClose className="size-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                    </Button>
                    {/* Mobile-only hamburger menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9 rounded-xl hover:bg-primary/5 shrink-0">
                                <Menu className="size-5 text-muted-foreground" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72 p-0 border-l glass-panel">
                            <div className="p-6 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                                        <Wand2 className="size-6 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg tracking-tight bg-linear-to-r from-primary to-indigo-500 bg-clip-text text-transparent italic">HUSAM-AI</span>
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">إدارة المتاجر الذكية</span>
                                    </div>
                                </div>
                            </div>
                            <nav className="px-3 py-6 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
                                {navigationGroups.map((group, groupIdx) => (
                                    <div key={groupIdx} className="space-y-1">
                                        <h3 className="px-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            {group.title}
                                            <span className="h-px bg-border/40 flex-1" />
                                        </h3>
                                        <div className="space-y-0.5">
                                            {group.items.map((item) => {
                                                const isActive = pathname === item.href
                                                const Icon = item.icon
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 ${
                                                            isActive 
                                                                ? 'bg-primary/10 text-primary shadow-sm font-bold' 
                                                                : 'text-muted-foreground hover:bg-primary/5 hover:text-primary font-medium'
                                                        }`}
                                                    >
                                                        <Icon className="h-5 w-5 shrink-0" />
                                                        <span className="text-sm">{item.label}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>

                    {/* Page title + breadcrumbs */}
                    <div className="flex flex-col min-w-0">
                        {/* Breadcrumbs - desktop only */}
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mb-0.5">
                            <Home className="size-3 shrink-0" />
                            <ChevronLeft className="size-3 shrink-0" />
                            {breadcrumbs.length > 0 ? (
                                breadcrumbs.map((b, i) => (
                                    <span key={b.href} className="flex items-center gap-1.5">
                                        <span className={i === breadcrumbs.length - 1 ? "text-primary font-semibold" : ""}>
                                            {b.label}
                                        </span>
                                        {i < breadcrumbs.length - 1 && <ChevronLeft className="size-3 shrink-0" />}
                                    </span>
                                ))
                            ) : (
                                <span className="text-primary font-semibold">الرئيسية</span>
                            )}
                        </div>
                        {/* Page title */}
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                            {currentPageTitle}
                        </h1>
                    </div>
                </div>
                            <ModeToggle />
                {/* ======== LEFT SIDE: Actions ======== */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Search */}
                    <CommandPalette />

                    {/* Notification Bell with Dropdown */}
                    <DropdownMenu onOpenChange={(open) => { if (open) loadNotifications() }}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-primary/5 transition-colors group">
                                <Bell className="size-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 size-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 rounded-xl p-0 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                                <span className="text-sm font-bold">الإشعارات</span>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                            {unreadCount} جديد
                                        </Badge>
                                    )}
                                    {unreadCount > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] px-2 text-primary hover:text-primary"
                                            onClick={handleMarkAllRead}
                                        >
                                            <CheckCheck className="h-3 w-3 ml-1" />
                                            قراءة الكل
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Notifications list */}
                            <div className="max-h-80 overflow-y-auto">
                                {recentNotifs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Bell className="size-8 text-muted-foreground/30 mb-2" />
                                        <span className="text-xs text-muted-foreground">لا توجد إشعارات</span>
                                    </div>
                                ) : (
                                    recentNotifs.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={cn(
                                                "flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-0 transition-colors hover:bg-muted/30",
                                                !notif.isRead && "bg-primary/3"
                                            )}
                                        >
                                            <div className={cn(
                                                "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                                notif.type === "out_of_stock" ? "bg-amber-500/10" : "bg-red-500/10"
                                            )}>
                                                {notif.type === "out_of_stock" ? (
                                                    <PackageX className="size-4 text-amber-600" />
                                                ) : (
                                                    <SearchX className="size-4 text-red-600" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">
                                                    بحث: <span className="text-primary font-bold">"{notif.searchQuery}"</span>
                                                </p>
                                                {notif.productName && (
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                        المنتج: {notif.productName}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {timeAgo(notif.createdAt)}
                                                </p>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t px-4 py-2 bg-muted/20">
                                <Link
                                    href="/notifications"
                                    className="text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1"
                                >
                                    عرض كل الإشعارات
                                    <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>



                    {/* Theme Toggle */}
                    

                    {/* Divider */}
                    <div className="hidden sm:block h-6 w-px bg-border/50 mx-1" />

                </div>
            </div>
        </header>
    )
}
