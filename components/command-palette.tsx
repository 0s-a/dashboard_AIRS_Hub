"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
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
import { navigationGroups, settingsNavigationItem } from "@/lib/navigation"

const commandPaletteGroups = [
    ...navigationGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.hidden && !item.disabled),
    })).filter((group) => group.items.length > 0),
    {
        title: "الإعدادات",
        items: [settingsNavigationItem],
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
                    {commandPaletteGroups.map((group, idx) => (
                        <div key={group.title}>
                            {idx > 0 && <CommandSeparator />}
                            <CommandGroup heading={group.title}>
                                {group.items.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <CommandItem
                                            key={item.href}
                                            value={`${item.label} ${item.keywords ?? ""}`}
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
