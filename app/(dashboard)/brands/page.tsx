"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Bookmark, Package, Search, RotateCcw, Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { BrandSheet } from "@/components/brands/brand-sheet"
import { buildColumns } from "@/components/brands/columns"
import { getBrands }    from "@/lib/actions/brands"
import { cn } from "@/lib/utils"
import type { BrandRow } from "@/lib/types/brand"
// ─── Types ─────────────────────────────────────────────────────
interface StatCard {
    label: string
    value: number
    icon:  LucideIcon
    color: string
    bg:    string
}
// ─── Page ──────────────────────────────────────────────────────
export default function BrandsPage() {
    const [brands,    setBrands]    = useState<BrandRow[]>([])
    const [loading,   setLoading]   = useState(true)
    const [search,    setSearch]    = useState("")
    const [sheetOpen, setSheetOpen] = useState(false)
    // ── Data fetching ───────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true)
        const res = await getBrands()
        if (res.success && res.data) setBrands(res.data as BrandRow[])
        setLoading(false)
    }, [])
    useEffect(() => { load() }, [load])
    // ── Sheet handler ───────────────────────────────────────────
    function handleSheetChange(open: boolean) {
        setSheetOpen(open)
        if (!open) load()   // refresh after closing
    }
    // ── Derived state ───────────────────────────────────────────
    const columns = useMemo(() => buildColumns(load), [load])
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return brands
        return brands.filter(b =>
            b.name.toLowerCase().includes(q) ||
            b.code.toLowerCase().includes(q)
        )
    }, [brands, search])
    const stats: StatCard[] = [
        {
            label: "إجمالي البراندات",
            value: brands.length,
            icon:  Bookmark,
            color: "text-primary",
            bg:    "bg-primary/10",
        },
        {
            label: "مرتبطة بمنتجات",
            value: brands.filter(b => b._count.products > 0).length,
            icon:  Package,
            color: "text-violet-600",
            bg:    "bg-violet-500/10",
        },
    ]
    // ── Render ──────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        البراندات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        إدارة براندات المنتجات وربطها بالمنتجات (SPU)
                    </p>
                </div>
                <Button
                    onClick={() => setSheetOpen(true)}
                    className="gap-2 rounded-xl shadow-md shadow-primary/20"
                >
                    <Plus className="h-4 w-4" />
                    إضافة براند
                </Button>
            </div>
            {/* ── Stat Cards ── */}
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
            {/* ── Search + Table ── */}
            <div className="glass-panel rounded-xl border border-border/50 p-6 space-y-4">
                {/* Search bar */}
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
                {/* Skeleton while loading empty state */}
                {loading && brands.length === 0 ? (
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
            {/* ── Add Brand Sheet ── */}
            <BrandSheet open={sheetOpen} onOpenChange={handleSheetChange} />
        </div>
    )
}
