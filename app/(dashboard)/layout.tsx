"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Users, Wand2, Layers, ChevronsLeft, ChevronsRight, UserSquare2, Images, Tag, UserCog, Coins, ArrowRight } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Footer } from "@/components/dashboard/footer"
import { navigationGroups, settingsNavigationItem } from "@/lib/navigation"
import { useNotificationAlert } from "@/hooks/use-notification-alert"
import { getStoreSettings } from "@/lib/actions/store-settings"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { unreadCount } = useNotificationAlert()
    const [storeInfo, setStoreInfo] = useState<{ name: string; logo: string | null }>({ name: "المتجر الرئيسي", logo: null })

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed")
        if (saved !== null) {
            setIsCollapsed(saved === "true")
        }
        // Fetch store settings
        getStoreSettings().then(res => {
            if (res.success && res.data) {
                setStoreInfo({ name: res.data.name, logo: res.data.logo })
            }
        })
    }, [])

    const pathname = usePathname()

    // Save sidebar state to localStorage
    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem("sidebar-collapsed", String(newState))
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background relative overflow-hidden">
            {/* Background decorative elements - Minimalist */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-background">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/5 opacity-50 blur-[100px]" />
            </div>

            <div className="relative z-10 flex min-h-screen w-full flex-col">
                <aside className={`fixed inset-y-0 right-0 z-20 hidden flex-col border-l border-border/40 bg-background sm:flex transition-all duration-300 will-change-[width] ${isCollapsed ? 'w-20' : 'w-64'}`}>
                    {/* Logo Section */}
                    <div className="p-6 pb-2">
                        <div className={`flex items-center gap-3 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="size-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 shrink-0 group transition-transform duration-300 hover:scale-105">
                                <span className="text-primary-foreground font-black text-xl leading-none" style={{ fontFamily: 'serif' }}>ن</span>
                            </div>
                            <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                <span className="font-bold text-lg tracking-tight text-foreground">نـــواة</span>
                                <span className="text-[9px] text-muted-foreground font-medium tracking-[0.2em] -mt-1 uppercase">Dashboard</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-6">
                        <TooltipProvider delayDuration={0}>
                            {navigationGroups.map((group, groupIdx) => {
                                const visibleItems = group.items.filter(item => !item.hidden);
                                if (visibleItems.length === 0) return null;

                                return (
                                    <div key={groupIdx} className="space-y-1.5">
                                        {!isCollapsed && (
                                            <h3 className="px-3 text-[11px] font-semibold text-muted-foreground/60 mb-2 mt-4">
                                                {group.title}
                                            </h3>
                                        )}

                                        <div className="space-y-1">
                                            {visibleItems.map((item) => {
                                                const isActive = pathname === item.href
                                                const Icon = item.icon
                                                const isDisabled = item.disabled;
                                                const badgeText = item.badge || "قيد التطوير";

                                                const content = (
                                                    <div
                                                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 group ${
                                                            isActive && !isDisabled
                                                                ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-primary/10' 
                                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:shadow-sm'
                                                        } ${isCollapsed ? 'justify-center' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                                    >
                                                        {/* Active Indicator Bar */}
                                                        {isActive && !isCollapsed && !isDisabled && (
                                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l-full bg-primary shadow-[0_0_8px_0_rgba(var(--primary),0.5)]" />
                                                        )}
                                                        
                                                        <Icon className={`h-5 w-5 transition-all duration-300 ${
                                                            isActive && !isDisabled ? 'scale-100 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'
                                                        } shrink-0`} />
                                                        
                                                        <span className={`text-[13px] transition-all duration-300 ${
                                                            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                                        }`}>
                                                            {item.label}
                                                        </span>

                                                        {/* Disabled Badge */}
                                                        {isDisabled && !isCollapsed && (
                                                            <span className="mr-auto text-[9px] font-bold bg-linear-to-r from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                                                                {badgeText}
                                                            </span>
                                                        )}

                                                        {/* Notification unread badge */}
                                                        {!isDisabled && item.href === "/notifications" && unreadCount > 0 && (
                                                            <span className={`flex items-center justify-center text-[10px] font-bold text-white bg-red-500 shadow-sm shadow-red-500/20 ${
                                                                isCollapsed
                                                                    ? 'absolute top-0 right-0 size-4 rounded-full border-2 border-background'
                                                                    : 'mr-auto min-w-[18px] h-[18px] px-1 rounded-full'
                                                            }`}>
                                                                {unreadCount > 99 ? '99+' : unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                )

                                                return (
                                                    <Tooltip key={item.href}>
                                                        <TooltipTrigger asChild>
                                                            {isDisabled ? content : <Link href={item.href}>{content}</Link>}
                                                        </TooltipTrigger>
                                                        {isCollapsed && (
                                                            <TooltipContent side="left" className="font-medium text-xs rounded-lg border-border/50">
                                                                {item.label} {isDisabled && `(${badgeText})`}
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </TooltipProvider>
                    </div>

                    {/* Settings & Bottom Store Info */}
                    <div className="p-4 mt-auto space-y-4">
                        {!settingsNavigationItem.hidden && (
                            <TooltipProvider delayDuration={0}>
                                {(() => {
                                    const item = settingsNavigationItem;
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;
                                    const isDisabled = item.disabled;
                                    const badgeText = item.badge || "قيد التطوير";

                                    const content = (
                                        <div
                                            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 group ${
                                                isActive && !isDisabled
                                                    ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-primary/10' 
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:shadow-sm'
                                            } ${isCollapsed ? 'justify-center' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                        >
                                            {/* Active Indicator Bar */}
                                            {isActive && !isCollapsed && !isDisabled && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l-full bg-primary shadow-[0_0_8px_0_rgba(var(--primary),0.5)]" />
                                            )}
                                            
                                            <Icon className={`h-5 w-5 transition-all duration-300 ${
                                                isActive && !isDisabled ? 'scale-100 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'
                                            } shrink-0`} />
                                            
                                            <span className={`text-[13px] transition-all duration-300 ${
                                                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                            }`}>
                                                {item.label}
                                            </span>

                                            {/* Disabled Badge */}
                                            {isDisabled && !isCollapsed && (
                                                <span className="mr-auto text-[9px] font-bold bg-linear-to-r from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                                                    {badgeText}
                                                </span>
                                            )}
                                        </div>
                                    )

                                    return (
                                        <Tooltip key={item.href}>
                                            <TooltipTrigger asChild>
                                                {isDisabled ? content : <Link href={item.href}>{content}</Link>}
                                            </TooltipTrigger>
                                            {isCollapsed && (
                                                <TooltipContent side="left" className="font-medium text-xs rounded-lg border-border/50">
                                                    {item.label} {isDisabled && `(${badgeText})`}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    )
                                })()}
                            </TooltipProvider>
                        )}

                        <div className={`rounded-xl border border-border/20 bg-linear-to-b from-muted/10 to-muted/30 hover:border-border/40 hover:from-muted/20 hover:to-muted/40 shadow-sm p-3 transition-all duration-300 cursor-pointer ${isCollapsed ? 'flex items-center justify-center p-2' : ''}`}>
                            {isCollapsed ? (
                                <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    {storeInfo.logo ? (
                                        <div className="relative size-9 rounded-lg overflow-hidden border border-border/50 shrink-0 bg-white shadow-sm">
                                            <Image
                                                src={storeInfo.logo}
                                                alt="شعار المتجر"
                                                fill
                                                className="object-contain p-1"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="size-9 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                                            <span className="text-primary font-bold text-sm tracking-tighter">N.</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-[10px] font-semibold text-emerald-500/90 dark:text-emerald-400">حالة النظام مستقرة</span>
                                        <span className="text-xs font-bold text-foreground truncate">{storeInfo.name}</span>
                                    </div>
                                    <div className="size-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px] shadow-emerald-500/50" />
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
                <div className={`flex flex-col w-full transition-all duration-300 ${isCollapsed ? 'sm:pr-20' : 'sm:pr-64'}`}>
                    <Header isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
                    <main className="p-8 sm:px-10 max-w-(--breakpoint-2xl) mx-auto w-full overflow-hidden">
                        {children}
                    </main>
                    <Footer />
                </div>
            </div>
        </div>
    )
}
