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
        title: "إدارة المخزون",
        items: [
            { href: "/inventory", label: "المخزون", icon: Package, keywords: "inventory products منتجات" },
            { href: "/categories", label: "التصنيفات", icon: Layers, keywords: "categories تصنيفات" },
        ],
    },
    {
        title: "العملاء والشركاء",
        items: [
            { href: "/persons", label: "الأشخاص", icon: Users, keywords: "persons people أشخاص عملاء" },
            { href: "/groups", label: "المجموعات", icon: UserSquare2, keywords: "groups مجموعات" },
            { href: "/person-types", label: "أنواع الأشخاص", icon: UserCog, keywords: "person types أنواع" },
        ],
    },
    {
        title: "النظام والتسعير",
        items: [
            { href: "/price-labels", label: "مسميات التسعيرات", icon: Tag, keywords: "price labels تسعيرات أسعار" },
            { href: "/currencies", label: "العملات", icon: Coins, keywords: "currencies عملات" },
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
                className="relative h-10 w-full max-w-[240px] justify-start gap-2 rounded-xl border-border/50 bg-muted/30 px-3 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
            >
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline-flex text-xs">بحث سريع...</span>
                <kbd className="pointer-events-none mr-auto hidden h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium opacity-80 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>

            {/* Command Dialog */}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="ابحث عن صفحة أو إجراء..." />
                <CommandList>
                    <CommandEmpty>
                        <div className="flex flex-col items-center gap-2 py-4">
                            <Search className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
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
                                            className="gap-3 px-3 py-2.5 cursor-pointer"
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                <Icon className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-medium">{item.label}</span>
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
