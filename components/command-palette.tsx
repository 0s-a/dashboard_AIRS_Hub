"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    LayoutDashboard,
    Package,
    Users,
    Layers,
    UserSquare2,
    Images,
    Tag,
    UserCog,
    Coins,
    Search,
    Megaphone,
    MessageSquare,
    ShoppingCart,
    ShieldCheck,
    Bell,
} from "lucide-react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

const navigationGroups = [
    {
        title: "الرئيسية",
        items: [
            { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, keywords: "dashboard home الرئيسية" },
        ],
    },
    {
        title: "الإعلانات والتواصل",
        items: [
            { href: "/announcements", label: "الإعلانات", icon: Megaphone, keywords: "announcements ads إعلانات حملات تعميم" },
            { href: "/announcements/templates", label: "قوالب الرسائل", icon: MessageSquare, keywords: "templates messages قوالب رسائل واتساب" },
        ],
    },
    {
        title: "الطلبات والمخزون",
        items: [
            { href: "/orders", label: "الطلبات", icon: ShoppingCart, keywords: "orders sales طلبات مبيعات فاتورة" },
            { href: "/inventory", label: "المخزون", icon: Package, keywords: "inventory products منتجات مخزون بضاعة" },
            { href: "/categories", label: "التصنيفات", icon: Layers, keywords: "categories تصنيفات اقسام" },
        ],
    },
    {
        title: "العملاء والمستخدمين",
        items: [
            { href: "/customers", label: "العملاء والعملاء", icon: Users, keywords: "customers people عملاء عملاء زبون" },
            { href: "/groups", label: "المجموعات", icon: UserSquare2, keywords: "groups مجموعات فئة" },
            { href: "/customer-types", label: "أنواع العملاء", icon: UserCog, keywords: "customer types أنواع" },
            { href: "/users", label: "المستخدمين", icon: ShieldCheck, keywords: "users admin مستخدمين إدارة موظفين" },
        ],
    },
    {
        title: "الإعدادات والنظام",
        items: [
            { href: "/price-labels", label: "مسميات التسعيرات", icon: Tag, keywords: "price labels تسعيرات أسعار" },
            { href: "/currencies", label: "العملات", icon: Coins, keywords: "currencies عملات صرف" },
            { href: "/notifications", label: "الإشعارات", icon: Bell, keywords: "notifications alerts إشعارات تنبيهات" },
        ],
    },
    {
        title: "الوسائط",
        items: [
            { href: "/gallery", label: "معرض الصور", icon: Images, keywords: "gallery images صور معرض" },
        ],
    },
]

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const handleSelect = (href: string) => {
        setOpen(false)
        router.push(href)
    }

    return (
        <>
            {/* Search trigger button */}
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="relative h-9 w-9 lg:w-full lg:max-w-[280px] justify-center lg:justify-start gap-2 rounded-xl border border-input bg-background/50 backdrop-blur-sm px-0 lg:px-3 text-sm text-muted-foreground shadow-xs hover:bg-background hover:text-foreground hover:border-primary/40 transition-all shrink-0 group"
            >
                <Search className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" />
                <span className="hidden lg:inline-flex text-xs font-medium">بحث في النظام...</span>
                <kbd className="pointer-events-none mr-auto hidden h-5 select-none items-center gap-1 rounded bg-muted/50 px-1.5 font-mono text-[10px] font-bold opacity-100 lg:flex group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <span className="text-[10px]">⌘</span>K
                </kbd>
            </Button>

            {/* Command Dialog */}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="ابحث عن صفحة، منتج، أو أمر..." />
                <CommandList>
                    <CommandEmpty>
                        <div className="flex flex-col items-center gap-2 py-8">
                            <div className="size-12 rounded-full border border-dashed flex items-center justify-center bg-muted/30">
                                <Search className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">لم يتم العثور على نتائج للبحث</p>
                            <p className="text-xs text-muted-foreground/60">جرب استخدام كلمات مفتاحية أخرى</p>
                        </div>
                    </CommandEmpty>
                    {navigationGroups.map((group, idx) => (
                        <div key={group.title}>
                            {idx > 0 && <CommandSeparator />}
                            <CommandGroup heading={group.title}>
                                {group.items.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <CommandItem
                                            key={item.href}
                                            value={`${item.label} ${item.keywords}`}
                                            onSelect={() => handleSelect(item.href)}
                                            className="gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-muted/60 transition-colors"
                                        >
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted border group-hover:border-primary/30 transition-colors">
                                                <Icon className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-semibold text-sm">{item.label}</span>
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </div>
                    ))}
                </CommandList>
            </CommandDialog>
        </>
    )
}
