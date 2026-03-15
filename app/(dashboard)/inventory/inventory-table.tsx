"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, customGlobalFilterFn } from "./columns"
import { VariantsList } from "@/components/inventory/variants-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { X, SlidersHorizontal, Tag, Layers, CheckCircle2, CircleDotDashed } from "lucide-react"
import { cn } from "@/lib/utils"

interface InventoryTableProps {
    products: any[]
}

export function InventoryTable({ products }: InventoryTableProps) {
    const [isMounted, setIsMounted] = useState(false)

    // ── Filter state ──────────────────────────────────
    const [filterCategory, setFilterCategory] = useState<string>("all")
    const [filterBrand, setFilterBrand]       = useState<string>("all")
    const [filterAvail, setFilterAvail]       = useState<"all" | "available" | "unavailable">("all")
    const [filterPriced, setFilterPriced]     = useState<"all" | "yes" | "no">("all")

    useEffect(() => { setIsMounted(true) }, [])

    // ── Derived filter options ────────────────────────
    const categories = useMemo(() => {
        const seen = new Set<string>()
        const opts: { id: string; name: string }[] = []
        products.forEach(p => {
            if (p.category && !seen.has(p.category.id)) {
                seen.add(p.category.id)
                opts.push({ id: p.category.id, name: p.category.name })
            }
        })
        return opts.sort((a, b) => a.name.localeCompare(b.name, "ar"))
    }, [products])

    const brands = useMemo(() => {
        const seen = new Set<string>()
        const opts: string[] = []
        products.forEach(p => {
            if (p.brand && !seen.has(p.brand)) {
                seen.add(p.brand)
                opts.push(p.brand)
            }
        })
        return opts.sort((a, b) => a.localeCompare(b, "ar"))
    }, [products])

    // ── Apply filters ─────────────────────────────────
    const filteredData = useMemo(() => {
        return products.filter(p => {
            if (filterCategory !== "all" && p.category?.id !== filterCategory) return false
            if (filterBrand !== "all" && p.brand !== filterBrand) return false
            if (filterAvail === "available"   && !p.isAvailable) return false
            if (filterAvail === "unavailable" &&  p.isAvailable) return false
            if (filterPriced === "yes" && (!p.productPrices || p.productPrices.length === 0)) return false
            if (filterPriced === "no"  &&   p.productPrices?.length > 0) return false
            return true
        })
    }, [products, filterCategory, filterBrand, filterAvail, filterPriced])

    const hasActiveFilters = filterCategory !== "all" || filterBrand !== "all" || filterAvail !== "all" || filterPriced !== "all"

    const resetFilters = useCallback(() => {
        setFilterCategory("all")
        setFilterBrand("all")
        setFilterAvail("all")
        setFilterPriced("all")
    }, [])

    if (!isMounted) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-12 rounded-xl bg-muted/40" />
                <div className="card-premium overflow-hidden">
                    <div className="h-10 bg-muted/30" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 border-t border-border/40 bg-muted/10" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* ── Filter bar ── */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/50 bg-muted/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    فلاتر:
                </div>

                {/* Category filter */}
                {categories.length > 0 && (
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className={cn(
                            "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[120px] gap-1.5",
                            filterCategory !== "all" && "border-primary/50 bg-primary/5 text-primary"
                        )}>
                            <Layers className="h-3 w-3 opacity-60 shrink-0" />
                            <SelectValue placeholder="التصنيف" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs rounded-lg">كل التصنيفات</SelectItem>
                            {categories.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs rounded-lg">{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Brand filter */}
                {brands.length > 0 && (
                    <Select value={filterBrand} onValueChange={setFilterBrand}>
                        <SelectTrigger className={cn(
                            "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[120px] gap-1.5",
                            filterBrand !== "all" && "border-primary/50 bg-primary/5 text-primary"
                        )}>
                            <Tag className="h-3 w-3 opacity-60 shrink-0" />
                            <SelectValue placeholder="البراند" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs rounded-lg">كل البراندات</SelectItem>
                            {brands.map(b => (
                                <SelectItem key={b} value={b} className="text-xs rounded-lg">{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Availability filter */}
                <Select value={filterAvail} onValueChange={v => setFilterAvail(v as any)}>
                    <SelectTrigger className={cn(
                        "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[110px] gap-1.5",
                        filterAvail !== "all" && "border-primary/50 bg-primary/5 text-primary"
                    )}>
                        <CheckCircle2 className="h-3 w-3 opacity-60 shrink-0" />
                        <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all"         className="text-xs rounded-lg">كل الحالات</SelectItem>
                        <SelectItem value="available"   className="text-xs rounded-lg">متوفر</SelectItem>
                        <SelectItem value="unavailable" className="text-xs rounded-lg">غير متوفر</SelectItem>
                    </SelectContent>
                </Select>

                {/* Has prices filter */}
                <Select value={filterPriced} onValueChange={v => setFilterPriced(v as any)}>
                    <SelectTrigger className={cn(
                        "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[110px] gap-1.5",
                        filterPriced !== "all" && "border-primary/50 bg-primary/5 text-primary"
                    )}>
                        <CircleDotDashed className="h-3 w-3 opacity-60 shrink-0" />
                        <SelectValue placeholder="التسعير" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-xs rounded-lg">كل المنتجات</SelectItem>
                        <SelectItem value="yes" className="text-xs rounded-lg">لديه أسعار</SelectItem>
                        <SelectItem value="no"  className="text-xs rounded-lg">بدون أسعار</SelectItem>
                    </SelectContent>
                </Select>

                {/* Active filter badges + reset */}
                <div className="flex items-center gap-1.5 flex-wrap mr-auto">
                    {filterCategory !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => setFilterCategory("all")}
                        >
                            {categories.find(c => c.id === filterCategory)?.name}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {filterBrand !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => setFilterBrand("all")}
                        >
                            {filterBrand}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {filterAvail !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => setFilterAvail("all")}
                        >
                            {filterAvail === "available" ? "متوفر" : "غير متوفر"}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {filterPriced !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => setFilterPriced("all")}
                        >
                            {filterPriced === "yes" ? "لديه أسعار" : "بدون أسعار"}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                            <X className="h-3 w-3 ml-1" />
                            مسح الكل
                        </Button>
                    )}
                </div>

                {/* Results count */}
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {filteredData.length !== products.length
                        ? <><span className="font-bold text-foreground">{filteredData.length}</span> من {products.length}</>
                        : <><span className="font-bold text-foreground">{products.length}</span> منتج</>
                    }
                </span>
            </div>

            {/* ── Table ── */}
            <DataTable
                columns={columns}
                data={filteredData}
                searchPlaceholder="ابحث بالاسم، الرقم، البراند، التصنيف، الوسم، الوصف..."
                groupingOptions={[
                    { id: "brand",       label: "البراند" },
                    { id: "isAvailable", label: "الحالة" },
                ]}
                renderSubComponent={({ row }) => {
                    const product = row.original as any
                    const primaryPrice = product.productPrices?.[0]?.value || null
                    const primaryImage = product.mediaImages?.find((img: any) => img.isPrimary)?.url || product.mediaImages?.[0]?.url

                    const variantsWithDefaults = (product.variants || []).map((v: any) => ({
                        ...v,
                        price: v.price ?? primaryPrice,
                        images: v.images?.length > 0 ? v.images : (primaryImage ? [{ url: primaryImage }] : []),
                        imageCount: v.imageCount > 0 ? v.imageCount : (primaryImage ? 1 : 0)
                    }))

                    return <VariantsList variants={variantsWithDefaults} />
                }}
                globalFilterFn={customGlobalFilterFn}
            />
        </div>
    )
}
