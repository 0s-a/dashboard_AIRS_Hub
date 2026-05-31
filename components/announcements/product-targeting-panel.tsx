"use client"

/**
 * components/announcements/product-targeting-panel.tsx
 *
 * Enhanced product targeting panel with:
 * - Category filter with product count badges
 * - Manual mode with image thumbnails, item numbers, category breadcrumb
 * - Select all / clear within a category
 * - Rich selected chips with image
 * - Preview count badge
 */

import { useState, useMemo } from "react"
import { Check, Search, X, Package, ChevronDown, ChevronUp, LayoutGrid, ListFilter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn }   from "@/lib/utils"
import type { ProductFilters } from "@/lib/types/announcements"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductItem {
    id:         string
    name:       string
    itemNumber: string
    categoryId: string | null
    mainImage?: string | null
}

interface Category { id: string; name: string }

interface ProductTargetingPanelProps {
    value:     { mode: "all" | "filter" | "manual"; filters: ProductFilters; manualIds: string[] }
    onChange:  (v: ProductTargetingPanelProps["value"]) => void
    products:  ProductItem[]
    categories: Category[]
    previewCount?: number
}

// ─── Mode definitions ─────────────────────────────────────────────────────────

const MODES = [
    { key: "all",    label: "الكل",   desc: "جميع المنتجات المتاحة", color: "text-emerald-600" },
    { key: "filter", label: "تصنيف",  desc: "تصفية بالتصنيف",         color: "text-indigo-600" },
    { key: "manual", label: "يدوي",   desc: "اختيار مباشر",           color: "text-primary"    },
] as const

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductTargetingPanel({
    value, onChange, products, categories, previewCount
}: ProductTargetingPanelProps) {
    const [search,          setSearch]          = useState("")
    const [expandedCats,    setExpandedCats]    = useState<Set<string>>(new Set())
    const [filterCatSearch, setFilterCatSearch] = useState("")

    const { mode, filters, manualIds } = value

    const setMode = (m: typeof mode) => onChange({ mode: m, filters: {}, manualIds: [] })

    // ── Derived ───────────────────────────────────────────────────────────────

    // Products per category (for filter mode badges)
    const countByCategory = useMemo(() => {
        const map: Record<string, number> = {}
        products.forEach(p => {
            const key = p.categoryId ?? "_none"
            map[key] = (map[key] ?? 0) + 1
        })
        return map
    }, [products])

    // Manual mode: group by category
    const productsByCategory = useMemo(() => {
        const map: Record<string, ProductItem[]> = {}
        products.forEach(p => {
            const key = p.categoryId ?? "_none"
            ;(map[key] = map[key] ?? []).push(p)
        })
        return map
    }, [products])

    // Manual mode: filtered list
    const filteredProducts = useMemo(() =>
        products.filter(p =>
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.itemNumber.toLowerCase().includes(search.toLowerCase())
        ),
        [products, search]
    )

    // Filter mode: filtered categories
    const filteredCategories = useMemo(() =>
        categories.filter(c =>
            !filterCatSearch ||
            c.name.toLowerCase().includes(filterCatSearch.toLowerCase())
        ),
        [categories, filterCatSearch]
    )

    // ── Handlers ──────────────────────────────────────────────────────────────

    const toggleCategory = (catId: string) => {
        const cur = filters.categoryIds || []
        onChange({ ...value, filters: { ...filters, categoryIds: cur.includes(catId) ? cur.filter((x: string) => x !== catId) : [...cur, catId] } })
    }

    const toggleManual = (id: string) => {
        const next = manualIds.includes(id)
            ? manualIds.filter(x => x !== id)
            : [...manualIds, id]
        onChange({ ...value, manualIds: next })
    }

    const removeManual = (id: string) => onChange({ ...value, manualIds: manualIds.filter(x => x !== id) })

    // Select all / deselect all in a category
    const toggleSelectCategory = (catId: string) => {
        const catProducts = productsByCategory[catId] ?? []
        const ids = catProducts.map(p => p.id)
        const allSelected = ids.every(id => manualIds.includes(id))
        const next = allSelected
            ? manualIds.filter(id => !ids.includes(id))
            : [...new Set([...manualIds, ...ids])]
        onChange({ ...value, manualIds: next })
    }

    const toggleExpandCat = (catId: string) =>
        setExpandedCats(prev => {
            const s = new Set(prev)
            s.has(catId) ? s.delete(catId) : s.add(catId)
            return s
        })

    const getCategoryName = (catId: string | null) =>
        categories.find(c => c.id === catId)?.name ?? "غير مصنّف"

    const getImageUrl = (img: string | null | undefined) => {
        if (!img) return null
        if (img.startsWith("http")) return img
        return `/uploads/${img}`
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-3">

            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
                {MODES.map(m => (
                    <button key={m.key} type="button" onClick={() => setMode(m.key)}
                        className={cn(
                            "relative flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-start transition-all duration-200",
                            mode === m.key
                                ? "border-primary/50 bg-primary/8 shadow-sm"
                                : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}>
                        <span className={cn("text-xs font-black", mode === m.key ? m.color : "")}>{m.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{m.desc}</span>
                        {mode === m.key && <div className="absolute top-2 left-2 size-1.5 rounded-full bg-primary" />}
                    </button>
                ))}
            </div>

            {/* ── Mode: ALL ── */}
            {mode === "all" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2.5 animate-in fade-in duration-200">
                    <Package className="size-3.5 text-emerald-600 shrink-0" />
                    <span>سيتم إرسال <strong className="text-emerald-600">{products.length}</strong> منتج لكل عميل</span>
                </div>
            )}

            {/* ── Mode: FILTER (by category) ── */}
            {mode === "filter" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <ListFilter className="size-3.5" /> التصنيفات
                        </p>
                        {(filters.categoryIds?.length ?? 0) > 0 && (
                            <button type="button"
                                onClick={() => onChange({ ...value, filters: { ...filters, categoryIds: [] } })}
                                className="text-[10px] text-destructive hover:underline font-semibold">
                                إلغاء التحديد
                            </button>
                        )}
                    </div>

                    {/* Category search */}
                    {categories.length > 6 && (
                        <div className="relative">
                            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                            <Input placeholder="ابحث في التصنيفات..." className="h-7 text-xs pr-8 rounded-lg"
                                value={filterCatSearch} onChange={e => setFilterCatSearch(e.target.value)} />
                        </div>
                    )}

                    {/* Category grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                        {filteredCategories.map(cat => {
                            const active = filters.categoryIds?.includes(cat.id)
                            const count  = countByCategory[cat.id] ?? 0
                            return (
                                <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                                    className={cn(
                                        "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-150",
                                        active
                                            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-600"
                                            : "border-border/50 hover:border-border hover:bg-muted/30"
                                    )}>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {active && <Check className="size-3 shrink-0" />}
                                        <span className="font-semibold truncate">{cat.name}</span>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full",
                                        active ? "bg-indigo-500/20 text-indigo-700" : "bg-muted text-muted-foreground"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            )
                        })}
                        {filteredCategories.length === 0 && (
                            <p className="col-span-2 text-xs text-muted-foreground py-3 text-center">لا توجد تصنيفات</p>
                        )}
                    </div>

                    {/* Preview: show filtered product names */}
                    {(filters.categoryIds?.length ?? 0) > 0 && (() => {
                        const shown = products.filter(p => filters.categoryIds?.includes(p.categoryId ?? ""))
                        return shown.length > 0 ? (
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-2.5">
                                <p className="text-[10px] font-bold text-indigo-600 mb-1.5">المنتجات المختارة ({shown.length})</p>
                                <div className="flex flex-wrap gap-1">
                                    {shown.slice(0, 12).map(p => (
                                        <span key={p.id} className="text-[10px] bg-indigo-500/10 text-indigo-700 px-1.5 py-0.5 rounded-md font-medium">
                                            {p.name}
                                        </span>
                                    ))}
                                    {shown.length > 12 && (
                                        <span className="text-[10px] text-muted-foreground">+{shown.length - 12} أخرى</span>
                                    )}
                                </div>
                            </div>
                        ) : null
                    })()}
                </div>
            )}

            {/* ── Mode: MANUAL ── */}
            {mode === "manual" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">

                    {/* Search + actions */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input placeholder="بحث بالاسم أو رقم المنتج..." className="h-9 text-xs pr-9 rounded-xl"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        {manualIds.length > 0 && (
                            <button type="button" onClick={() => onChange({ ...value, manualIds: [] })}
                                className="text-[10px] font-bold text-destructive hover:bg-destructive/10 px-2 rounded-lg border border-destructive/30 transition-colors">
                                مسح الكل
                            </button>
                        )}
                    </div>

                    {/* Product list */}
                    {search ? (
                        /* Flat list when searching */
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-border/50 p-1 space-y-0.5">
                            {filteredProducts.slice(0, 40).map(p => <ProductRow key={p.id} p={p} selected={manualIds.includes(p.id)} onToggle={() => toggleManual(p.id)} categories={categories} />)}
                            {filteredProducts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>}
                        </div>
                    ) : (
                        /* Grouped by category */
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/30">
                            {Object.entries(productsByCategory).map(([catId, catProducts]) => {
                                const catName    = getCategoryName(catId === "_none" ? null : catId)
                                const expanded   = expandedCats.has(catId) || catId === "_none"
                                const selectedN  = catProducts.filter(p => manualIds.includes(p.id)).length
                                const allSel     = selectedN === catProducts.length
                                return (
                                    <div key={catId}>
                                        {/* Category header */}
                                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 sticky top-0">
                                            <button type="button" onClick={() => toggleExpandCat(catId)}
                                                className="flex-1 flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                                                {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                                {catName}
                                                <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                                                    {catProducts.length}
                                                </span>
                                            </button>
                                            <button type="button" onClick={() => toggleSelectCategory(catId)}
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all shrink-0",
                                                    allSel && selectedN > 0
                                                        ? "bg-primary/10 text-primary border-primary/30"
                                                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
                                                )}>
                                                {allSel && selectedN > 0 ? "إلغاء الكل" : `تحديد الكل (${catProducts.length})`}
                                            </button>
                                            {selectedN > 0 && (
                                                <span className="text-[10px] font-black text-primary shrink-0">{selectedN}✓</span>
                                            )}
                                        </div>
                                        {/* Products */}
                                        {expanded && catProducts.map(p => (
                                            <ProductRow key={p.id} p={p} selected={manualIds.includes(p.id)} onToggle={() => toggleManual(p.id)} categories={categories} />
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Selected chips ── */}
            {mode === "manual" && manualIds.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        المحددة ({manualIds.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {manualIds.map(id => {
                            const p = products.find(x => x.id === id)
                            const img = getImageUrl(p?.mainImage)
                            return (
                                <span key={id}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2 py-1 rounded-xl">
                                    {img ? (
                                        <img src={img} alt="" className="size-4 rounded object-cover shrink-0" />
                                    ) : (
                                        <Package className="size-3.5 shrink-0" />
                                    )}
                                    <span className="max-w-[100px] truncate">{p?.name || id.slice(0, 8)}</span>
                                    <button type="button" onClick={() => removeManual(id)} className="hover:text-destructive transition-colors ml-0.5">
                                        <X className="size-3" />
                                    </button>
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Preview count ── */}
            <div className={cn(
                "flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-colors",
                (previewCount ?? 0) > 0 ? "bg-indigo-500/10 text-indigo-600" : "bg-muted/40 text-muted-foreground"
            )}>
                <Package className="size-3.5" />
                <span className="font-black">{previewCount ?? "—"}</span> منتج مشمول في الإعلان
            </div>
        </div>
    )
}

// ─── Product Row (shared between search + grouped views) ─────────────────────

function ProductRow({
    p, selected, onToggle, categories
}: {
    p: ProductItem
    selected: boolean
    onToggle: () => void
    categories: Category[]
}) {
    const catName = categories.find(c => c.id === p.categoryId)?.name
    const img = p.mainImage
        ? (p.mainImage.startsWith("http") ? p.mainImage : `/uploads/${p.mainImage}`)
        : null

    return (
        <button type="button" onClick={onToggle}
            className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-start transition-all duration-150 text-xs",
                selected ? "bg-primary/8 text-primary" : "hover:bg-muted/40"
            )}>

            {/* Checkbox */}
            <div className={cn(
                "size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                selected ? "bg-primary border-primary" : "border-border"
            )}>
                {selected && <Check className="size-2.5 text-white" />}
            </div>

            {/* Thumbnail */}
            <div className="size-8 rounded-lg overflow-hidden border border-border/40 bg-muted/30 flex items-center justify-center shrink-0">
                {img
                    ? <img src={img} alt="" className="w-full h-full object-cover" />
                    : <Package className="size-3.5 text-muted-foreground" />
                }
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
                <p className={cn("font-semibold truncate", selected && "text-primary")}>{p.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">{p.itemNumber}</span>
                    {catName && (
                        <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[10px] text-muted-foreground">{catName}</span>
                        </>
                    )}
                </div>
            </div>
        </button>
    )
}
