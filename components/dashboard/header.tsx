"use client"

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
    PanelRightOpen
} from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Button } from "@/components/ui/button"
import { CommandPalette } from "@/components/command-palette"
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
}

export function Header({ isCollapsed, toggleSidebar }: HeaderProps) {
    const pathname = usePathname()
    
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

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-primary/5 transition-colors group">
                        <Bell className="size-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-background" />
                    </Button>



                    {/* Theme Toggle */}
                    

                    {/* Divider */}
                    <div className="hidden sm:block h-6 w-px bg-border/50 mx-1" />

                </div>
            </div>
        </header>
    )
}
