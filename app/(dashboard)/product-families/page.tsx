"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Package, Boxes, Search, RotateCcw, Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { ProductFamilySheet } from "@/components/product-families/product-family-sheet"
import { buildColumns } from "@/components/product-families/columns"
import { getProductFamilies } from "@/lib/actions/product-families"
import { cn } from "@/lib/utils"
import type { ProductFamilyRow } from "@/lib/types/product-family"

interface StatCard {
    label: string
    value: number
    icon: LucideIcon
    color: string
    bg: string
}

export default function ProductFamiliesPage() {
    const [families, setFamilies] = useState<ProductFamilyRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [sheetOpen, setSheetOpen] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await getProductFamilies()
        if (res.success && res.data) setFamilies(res.data as ProductFamilyRow[])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    function handleSheetChange(open: boolean) {
        setSheetOpen(open)
        if (!open) load()
    }

    const columns = useMemo(() => buildColumns(load), [load])
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return families
        return families.filter(f =>
            f.name.toLowerCase().includes(q) ||
            f.code.toLowerCase().includes(q)
        )
    }, [families, search])

    const stats: StatCard[] = [
        {
            label: "إجمالي المنتجات الرئيسية",
            value: families.length,
            icon: Package,
            color: "text-primary",
            bg: "bg-primary/10",
        },
        {
            label: "مرتبطة بمنتجات",
            value: families.filter(f => f._count.products > 0).length,
            icon: Boxes,
            color: "text-violet-600",
            bg: "bg-violet-500/10",
        },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        المنتجات الرئيسية
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        تجميع الأصناف المرتبطة (ألوان/مقاسات) تحت منتج رئيسي واحد
                    </p>
                </div>
                <Button
                    onClick={() => setSheetOpen(true)}
                    className="gap-2 rounded-xl shadow-md shadow-primary/20"
                >
                    <Plus className="h-4 w-4" />
                    إضافة منتج رئيسي
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {stats.map(card => (
                    <div
                        key={card.label}
                        className="glass-panel rounded-xl p-5 border border-border/50 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-sm text-muted-foreground">{card.label}</p>
                            <p className="text-3xl font-bold mt-1">{card.value}</p>
                        </div>
                        <div className={cn("size-11 rounded-xl flex items-center justify-center", card.bg)}>
                            <card.icon className={cn("size-5", card.color)} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-panel rounded-xl border border-border/50 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ابحث بالاسم أو الكود..."
                            className="pr-9 h-9 rounded-xl border-border/50"
                        />
                    </div>
                    {search && (
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => setSearch("")}
                            className="h-9 gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            مسح
                        </Button>
                    )}
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                {loading && families.length === 0 ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-10 bg-muted/40 rounded-lg" />
                        {Array.from({ length: 4 }, (_, i) => (
                            <div key={i} className="h-14 bg-muted/20 rounded-lg border border-border/30" />
                        ))}
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={filtered}
                        showSearch={false}
                        showPagination={false}
                        totalCount={filtered.length}
                        onRefresh={load}
                    />
                )}
            </div>

            <ProductFamilySheet open={sheetOpen} onOpenChange={handleSheetChange} />
        </div>
    )
}
