"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { LayoutDashboard, Package, Users, Wand2, Layers, ChevronsLeft, ChevronsRight, UserSquare2, Images, Tag, UserCog } from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed")
        if (saved !== null) {
            setIsCollapsed(saved === "true")
        }
    }, [])

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
                    <div className="p-6 border-b border-border/50">
                        <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                                <Wand2 className="size-6 text-white" />
                            </div>
                            <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                <span className="font-bold text-lg tracking-tight whitespace-nowrap">HUSAM-AI</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest -mt-1 whitespace-nowrap">لوحة التحكم </span>
                            </div>
                        </div>
                    </div>
                    <nav className="flex flex-col items-start gap-2 px-3 py-6">
                        <Link
                            href="/"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "لوحة التحكم" : ""}
                        >
                            <LayoutDashboard className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>لوحة التحكم</span>
                        </Link>
                        <Link
                            href="/inventory"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "المخزون" : ""}
                        >
                            <Package className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>المخزون</span>
                        </Link>
                        <Link
                            href="/persons"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "الأشخاص" : ""}
                        >
                            <Users className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>الأشخاص</span>
                        </Link>
                        <Link
                            href="/groups"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "المجموعات" : ""}
                        >
                            <UserSquare2 className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>المجموعات</span>
                        </Link>
                        <Link
                            href="/categories"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "التصنيفات" : ""}
                        >
                            <Layers className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>التصنيفات</span>
                        </Link>
                        <Link
                            href="/price-labels"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "مسميات التسعيرات" : ""}
                        >
                            <Tag className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>مسميات التسعيرات</span>
                        </Link>
                        <Link
                            href="/person-types"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "أنواع الأشخاص" : ""}
                        >
                            <UserCog className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>أنواع الأشخاص</span>
                        </Link>
                        <Link
                            href="/gallery"
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary group ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "معرض الصور" : ""}
                        >
                            <Images className="h-5 w-5 group-hover:scale-110 transition-transform shrink-0" />
                            <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>معرض الصور</span>
                        </Link>

                    </nav>
                    <div className={`mt-auto p-4 border-t border-border/50 ${isCollapsed ? 'hidden' : ''}`}>
                        <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
                            <div className="size-8 rounded-full bg-linear-to-tr from-primary to-indigo-400" />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold truncate">المتجر الرئيسي</span>
                                <span className="text-[10px] text-muted-foreground truncate">خطة بريميوم</span>
                            </div>
                        </div>
                    </div>
                </aside>
                <div className={`flex flex-col w-full transition-all duration-300 ${isCollapsed ? 'sm:pr-20' : 'sm:pr-64'}`}>
                    <header className="sticky z-30 flex h-20 items-center gap-4 px-6 sm:px-10 border-b glass-panel">
                        <div className="flex-1">
                            <h2 className="text-sm font-semibold text-muted-foreground">مرحباً بك مجدداً</h2>
                            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="hidden sm:flex h-10 w-10 rounded-xl hover:bg-primary/5 transition-all group"
                                title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
                            >
                                {isCollapsed ? (
                                    <ChevronsLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:scale-110" />
                                ) : (
                                    <ChevronsRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:scale-110" />
                                )}
                            </Button>
                            <ModeToggle />
                        </div>
                    </header>
                    <main className="p-8 sm:px-10 max-w-(--breakpoint-2xl) mx-auto w-full overflow-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
