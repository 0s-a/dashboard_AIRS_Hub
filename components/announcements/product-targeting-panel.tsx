"use client"

import { useState } from "react"
import { Check, Search, X, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ProductFilters } from "@/lib/actions/announcements"

interface ProductItem { id: string; name: string; itemNumber: string; categoryId: string | null }
interface Category { id: string; name: string }

interface ProductTargetingPanelProps {
    value: { mode: "all" | "filter" | "manual"; filters: ProductFilters; manualIds: string[] }
    onChange: (v: ProductTargetingPanelProps["value"]) => void
    products: ProductItem[]
    categories: Category[]
    previewCount?: number
}

const MODES = [
    { key: "all",    label: "الكل",    desc: "جميع المنتجات المتاحة" },
    { key: "filter", label: "تصفية",   desc: "حسب التصنيف" },
    { key: "manual", label: "يدوي",    desc: "بحث وتحديد مباشر" },
] as const

export function ProductTargetingPanel({ value, onChange, products, categories, previewCount }: ProductTargetingPanelProps) {
    const [search, setSearch] = useState("")
    const { mode, filters, manualIds } = value

    const setMode = (m: typeof mode) => onChange({ mode: m, filters: {}, manualIds: [] })

    const filtered = products.filter(p =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.itemNumber.toLowerCase().includes(search.toLowerCase())
    )

    const toggleCategory = (catId: string) => {
        const cur = filters.categoryIds || []
        onChange({ ...value, filters: { ...filters, categoryIds: cur.includes(catId) ? cur.filter(x => x !== catId) : [...cur, catId] } })
    }

    const toggleManual = (id: string) => {
        const next = manualIds.includes(id)
            ? manualIds.filter(x => x !== id)
            : [...manualIds, id]
        onChange({ ...value, manualIds: next })
    }

    const removeManual = (id: string) => onChange({ ...value, manualIds: manualIds.filter(x => x !== id) })

    return (
        <div className="space-y-3">
            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
                {MODES.map(m => (
                    <button key={m.key} type="button" onClick={() => setMode(m.key)}
                        className={cn(
                            "relative flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-start transition-all duration-200",
                            mode === m.key
                                ? "border-primary/50 bg-primary/8 text-primary shadow-sm"
                                : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}>
                        <span className="text-xs font-bold">{m.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{m.desc}</span>
                        {mode === m.key && <div className="absolute top-2 left-2 size-1.5 rounded-full bg-primary" />}
                    </button>
                ))}
            </div>

            {/* Mode: filter */}
            {mode === "filter" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-xs font-semibold text-muted-foreground">التصنيف</p>
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map(cat => {
                            const active = filters.categoryIds?.includes(cat.id)
                            return (
                                <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                                    className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-150",
                                        active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/50 hover:border-border hover:bg-muted/30"
                                    )}>
                                    {active && <Check className="size-3" />}
                                    {cat.name}
                                </button>
                            )
                        })}
                        {categories.length === 0 && <p className="text-xs text-muted-foreground">لا توجد تصنيفات</p>}
                    </div>
                </div>
            )}

            {/* Mode: manual */}
            {mode === "manual" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input placeholder="بحث بالاسم أو رقم المنتج..." className="h-9 text-xs pr-9 rounded-xl"
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-xl border border-border/50 p-1">
                        {filtered.slice(0, 30).map(p => {
                            const selected = manualIds.includes(p.id)
                            return (
                                <button key={p.id} type="button" onClick={() => toggleManual(p.id)}
                                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-start transition-all duration-150 text-xs",
                                        selected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/40"
                                    )}>
                                    <div className={cn("size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                                        selected ? "bg-primary border-primary" : "border-border"
                                    )}>
                                        {selected && <Check className="size-2.5 text-white" />}
                                    </div>
                                    <span className="flex-1">{p.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{p.itemNumber}</span>
                                </button>
                            )
                        })}
                        {filtered.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
                        )}
                    </div>
                </div>
            )}

            {/* Chips */}
            {mode === "manual" && manualIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {manualIds.map(id => {
                        const p = products.find(x => x.id === id)
                        return (
                            <span key={id} className="flex items-center gap-1 text-[11px] font-medium bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                {p?.name || id.slice(0, 8)}
                                <button type="button" onClick={() => removeManual(id)} className="hover:text-destructive transition-colors">
                                    <X className="size-3" />
                                </button>
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Preview count */}
            <div className={cn("flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-colors",
                (previewCount ?? 0) > 0 ? "bg-indigo-500/10 text-indigo-600" : "bg-muted/40 text-muted-foreground"
            )}>
                <Package className="size-3.5" />
                <span className="font-black">{previewCount ?? "—"}</span> منتج محدد
            </div>
        </div>
    )
}
