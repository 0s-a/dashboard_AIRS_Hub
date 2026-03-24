"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Users, Wand2, Layers, ChevronsLeft, ChevronsRight, UserSquare2, Images, Tag, UserCog, Coins, ArrowRight } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Footer } from "@/components/dashboard/footer"
import { navigationGroups } from "@/lib/navigation"
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
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 dark:bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-500/5 dark:bg-indigo-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex min-h-screen w-full flex-col">
                <aside className={`fixed inset-y-0 right-0 z-20 hidden flex-col border-l glass-panel sm:flex transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
                    <div className="p-6">
                        <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 group hover:rotate-12 transition-transform duration-500">
                                <span className="text-white font-black text-xl leading-none" style={{fontFamily: 'serif'}}>ن</span>
                            </div>
                            <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                <span className="font-black text-lg tracking-tight whitespace-nowrap bg-linear-to-r from-primary to-indigo-500 bg-clip-text text-transparent">نواة</span>
                                <span className="text-[9px] text-muted-foreground font-bold tracking-[0.2em] -mt-0.5 whitespace-nowrap uppercase">Nawaat</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-6">
                        <TooltipProvider delayDuration={0}>
                            {navigationGroups.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-1">
                                    {!isCollapsed && (
                                        <h3 className="px-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span className="h-px bg-border/40 flex-1" />
                                            {group.title}
                                            <span className="h-px bg-border/40 flex-1 sm:hidden" />
                                        </h3>
                                    )}

                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const isActive = pathname === item.href
                                            const Icon = item.icon
                                            return (
                                                <Tooltip key={item.href}>
                                                    <TooltipTrigger asChild>
                                                        <Link
                                                            href={item.href}
                                                            className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 group ${
                                                                isActive 
                                                                    ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5' 
                                                                    : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                                        >
                                                            {/* Active Indicator Bar */}
                                                            {isActive && (
                                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l-full bg-primary" />
                                                            )}
                                                            
                                                            <Icon className={`h-5 w-5 transition-all duration-300 ${
                                                                isActive ? 'scale-110 rotate-3' : 'group-hover:scale-110 group-hover:-rotate-3'
                                                            } shrink-0`} />
                                                            
                                                            <span className={`text-[13px] font-semibold transition-all duration-300 ${
                                                                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                                            }`}>
                                                                {item.label}
                                                            </span>

                                                            {/* Notification unread badge */}
                                                            {item.href === "/notifications" && unreadCount > 0 && (
                                                                <span className={`flex items-center justify-center text-[10px] font-bold text-white bg-red-500 shadow-lg shadow-red-500/30 animate-pulse ${
                                                                    isCollapsed
                                                                        ? 'absolute -top-1 -left-1 size-5 rounded-full'
                                                                        : 'mr-auto min-w-[20px] h-5 px-1.5 rounded-full'
                                                                }`}>
                                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    </TooltipTrigger>
                                                    {isCollapsed && (
                                                        <TooltipContent side="left" className="font-bold text-xs bg-primary text-white border-none shadow-xl">
                                                            {item.label}
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </TooltipProvider>
                    </div>

                    <div className="p-4 mt-auto">
                        <div className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-500 bg-linear-to-br from-primary/95 to-indigo-600 group shadow-lg shadow-primary/20 ${isCollapsed ? 'h-12 w-12 p-0 flex items-center justify-center' : ''}`}>
                            {/* Decorative bubbles for footer card */}
                            <div className="absolute -top-4 -right-4 size-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="absolute -bottom-4 -left-4 size-16 bg-indigo-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                            
                            {isCollapsed ? (
                                <div className="size-2 rounded-full bg-white animate-pulse" />
                            ) : (
                                <div className="relative z-10 flex items-center gap-3">
                                    {storeInfo.logo ? (
                                        <div className="relative size-10 rounded-xl overflow-hidden ring-2 ring-white/20 shrink-0">
                                            <Image
                                                src={storeInfo.logo}
                                                alt="شعار المتجر"
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                            <span className="text-white font-black text-lg" style={{fontFamily: 'serif'}}>{storeInfo.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest italic">المتجر الحالي</span>
                                            <div className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
                                        </div>
                                        <span className="text-sm font-bold text-white truncate drop-shadow-sm">{storeInfo.name}</span>
                                    </div>
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
