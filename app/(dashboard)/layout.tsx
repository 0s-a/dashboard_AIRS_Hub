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
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/3 dark:bg-primary/8 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[5%] w-[30%] h-[30%] bg-indigo-500/3 dark:bg-indigo-500/8 rounded-full blur-[100px]" />
                <div className="absolute bottom-[10%] left-[20%] w-[25%] h-[25%] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 flex min-h-screen w-full flex-col">
                <aside className={`fixed inset-y-0 right-0 z-20 hidden flex-col border-l border-border/20 bg-background/95 backdrop-blur-xl sm:flex transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
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
                            {navigationGroups.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-1.5">
                                    {!isCollapsed && (
                                        <h3 className="px-3 text-[11px] font-semibold text-muted-foreground/60 mb-2 mt-4">
                                            {group.title}
                                        </h3>
                                    )}

                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            const isActive = pathname === item.href
                                            const Icon = item.icon
                                            return (
                                                <Tooltip key={item.href}>
                                                    <TooltipTrigger asChild>
                                                        <Link
                                                            href={item.href}
                                                            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group ${
                                                                isActive 
                                                                    ? 'bg-primary/10 text-primary font-bold' 
                                                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                                        >
                                                            {/* Active Indicator Bar */}
                                                            {isActive && !isCollapsed && (
                                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-l-full bg-primary" />
                                                            )}
                                                            
                                                            <Icon className={`h-5 w-5 transition-transform duration-200 ${
                                                                isActive ? 'scale-100' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'
                                                            } shrink-0`} />
                                                            
                                                            <span className={`text-[13px] transition-all duration-300 ${
                                                                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                                            }`}>
                                                                {item.label}
                                                            </span>

                                                            {/* Notification unread badge */}
                                                            {item.href === "/notifications" && unreadCount > 0 && (
                                                                <span className={`flex items-center justify-center text-[10px] font-bold text-white bg-red-500 shadow-sm shadow-red-500/20 ${
                                                                    isCollapsed
                                                                        ? 'absolute top-0 right-0 size-4 rounded-full border-2 border-background'
                                                                        : 'mr-auto min-w-[18px] h-[18px] px-1 rounded-full'
                                                                }`}>
                                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    </TooltipTrigger>
                                                    {isCollapsed && (
                                                        <TooltipContent side="left" className="font-medium text-xs rounded-lg border-border/50">
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

                    {/* Bottom Store Info */}
                    <div className="p-4 mt-auto">
                        <div className={`rounded-xl border border-transparent hover:border-border/40 bg-muted/20 hover:bg-muted/40 p-3 transition-all duration-300 cursor-pointer ${isCollapsed ? 'flex items-center justify-center p-2' : ''}`}>
                            {isCollapsed ? (
                                <div className="size-2 rounded-full bg-emerald-500" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    {storeInfo.logo ? (
                                        <div className="relative size-9 rounded-lg overflow-hidden border border-border/50 shrink-0 bg-white">
                                            <Image
                                                src={storeInfo.logo}
                                                alt="شعار المتجر"
                                                fill
                                                className="object-contain p-1"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-primary font-bold text-sm tracking-tighter">N.</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-[10px] font-medium text-muted-foreground/80">حالة النظام</span>
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
