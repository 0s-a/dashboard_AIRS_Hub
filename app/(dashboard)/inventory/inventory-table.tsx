"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, customGlobalFilterFn } from "./columns"
import { VariantsList } from "@/components/inventory/variants-list"
import { ServerPagination } from "@/components/ui/server-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    X,
    SlidersHorizontal,
    Tag,
    Layers,
    CheckCircle2,
    CircleDotDashed,
    Search,
    Loader2,
    RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getProductsPaginated } from "@/lib/actions/inventory"
import type { PaginationMeta } from "@/lib/actions/inventory"

interface FilterOption {
    id: string
    name: string
}

interface InventoryTableProps {
    // Initial SSR data
    initialProducts: any[]
    initialPagination: PaginationMeta
    // Filter options (fetched server-side once)
    filterCategories: FilterOption[]
    filterBrands: string[]
    onRefresh?: () => void | Promise<void>
}

const SEARCH_DEBOUNCE_MS = 350

export function InventoryTable({
    initialProducts,
    initialPagination,
    filterCategories,
    filterBrands,
    onRefresh,
}: InventoryTableProps) {
    const [isMounted, setIsMounted]         = useState(false)
    const [isPending, startTransition]      = useTransition()

    // ── Data state ──────────────────────────────────────────
    const [products, setProducts]           = useState(initialProducts)
    const [pagination, setPagination]       = useState<PaginationMeta>(initialPagination)

    // ── Filter state ─────────────────────────────────────────
    const [search, setSearch]               = useState("")
    const [filterCategory, setFilterCategory] = useState("all")
    const [filterBrand, setFilterBrand]     = useState("all")
    const [filterAvail, setFilterAvail]     = useState<"all" | "available" | "unavailable">("all")
    const [filterPriced, setFilterPriced]   = useState<"all" | "yes" | "no">("all")

    // ── Pagination state ──────────────────────────────────────
    const [page, setPage]   = useState(1)
    const [limit, setLimit] = useState(initialPagination.limit)

    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { setIsMounted(true) }, [])

    // ── Core fetch function ──────────────────────────────────
    const fetchProducts = useCallback((params: {
        search?: string
        categoryId?: string
        brand?: string
        isAvailable?: boolean
        hasPrices?: boolean
        page?: number
        limit?: number
    }) => {
        startTransition(async () => {
            const res = await getProductsPaginated({
                search:      params.search,
                categoryId:  params.categoryId,
                brand:       params.brand,
                isAvailable: params.isAvailable,
                hasPrices:   params.hasPrices,
                page:        params.page ?? 1,
                limit:       params.limit ?? limit,
                sortBy:      'createdAt',
                sortDir:     'desc',
            })
            if (res.success) {
                setProducts(res.data)
                setPagination(res.pagination)
            }
        })
    }, [limit])

    // ── Helpers: build complete filter params from current state ────────────
    // NOTE: each handler passes its NEW value directly to avoid reading stale state
    const currentFilters = () => ({
        search:      search || undefined,
        categoryId:  filterCategory !== "all" ? filterCategory : undefined,
        brand:       filterBrand    !== "all" ? filterBrand    : undefined,
        isAvailable: filterAvail    === "available"   ? true
                   : filterAvail    === "unavailable" ? false
                   : undefined,
        hasPrices:   filterPriced   === "yes" ? true
                   : filterPriced   === "no"  ? false
                   : undefined,
        limit,
    })

    // ── Search debounce ──────────────────────────────────────
    const handleSearchChange = (value: string) => {
        setSearch(value)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            setPage(1)
            fetchProducts({ ...currentFilters(), search: value || undefined, page: 1 })
        }, SEARCH_DEBOUNCE_MS)
    }

    // ── Individual filter handlers (reset page to 1) ─────────
    const handleCategoryChange = (value: string) => {
        setFilterCategory(value)
        setPage(1)
        fetchProducts({ ...currentFilters(), categoryId: value !== "all" ? value : undefined, page: 1 })
    }

    const handleBrandChange = (value: string) => {
        setFilterBrand(value)
        setPage(1)
        fetchProducts({ ...currentFilters(), brand: value !== "all" ? value : undefined, page: 1 })
    }

    const handleAvailChange = (value: "all" | "available" | "unavailable") => {
        setFilterAvail(value)
        setPage(1)
        fetchProducts({
            ...currentFilters(),
            isAvailable: value === "available" ? true : value === "unavailable" ? false : undefined,
            page: 1,
        })
    }

    const handlePricedChange = (value: "all" | "yes" | "no") => {
        setFilterPriced(value)
        setPage(1)
        fetchProducts({
            ...currentFilters(),
            hasPrices: value === "yes" ? true : value === "no" ? false : undefined,
            page: 1,
        })
    }

    // ── Pagination handlers ───────────────────────────────────
    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        fetchProducts({ ...currentFilters(), page: newPage })
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit)
        setPage(1)
        fetchProducts({ ...currentFilters(), limit: newLimit, page: 1 })
    }

    // ── Reset all filters ─────────────────────────────────────
    const resetFilters = () => {
        setSearch("")
        setFilterCategory("all")
        setFilterBrand("all")
        setFilterAvail("all")
        setFilterPriced("all")
        setPage(1)
        fetchProducts({ page: 1, limit })
    }

    const hasActiveFilters =
        search !== "" ||
        filterCategory !== "all" ||
        filterBrand    !== "all" ||
        filterAvail    !== "all" ||
        filterPriced   !== "all"

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
            {/* ── Search Bar ─────────────────────────────────── */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                {isPending && (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                )}
                <Input
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="ابحث بالاسم، الرقم، البراند، التصنيف، الخيار، الوصف..."
                    className={cn(
                        "pr-9 pl-9 h-10 rounded-xl border-border/50 bg-background transition-all",
                        isPending && "opacity-80"
                    )}
                />
                {search && (
                    <button
                        onClick={() => handleSearchChange("")}
                        className="absolute left-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* ── Filter bar ─────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/50 bg-muted/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    فلاتر:
                </div>

                {/* Category filter */}
                {filterCategories.length > 0 && (
                    <Select value={filterCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className={cn(
                            "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[120px] gap-1.5",
                            filterCategory !== "all" && "border-primary/50 bg-primary/5 text-primary"
                        )}>
                            <Layers className="h-3 w-3 opacity-60 shrink-0" />
                            <SelectValue placeholder="التصنيف" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs rounded-lg">كل التصنيفات</SelectItem>
                            {filterCategories.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs rounded-lg">{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Brand filter */}
                {filterBrands.length > 0 && (
                    <Select value={filterBrand} onValueChange={handleBrandChange}>
                        <SelectTrigger className={cn(
                            "h-8 text-xs rounded-lg border-border/50 bg-background w-auto min-w-[120px] gap-1.5",
                            filterBrand !== "all" && "border-primary/50 bg-primary/5 text-primary"
                        )}>
                            <Tag className="h-3 w-3 opacity-60 shrink-0" />
                            <SelectValue placeholder="البراند" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-xs rounded-lg">كل البراندات</SelectItem>
                            {filterBrands.map(b => (
                                <SelectItem key={b} value={b} className="text-xs rounded-lg">{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Availability filter */}
                <Select value={filterAvail} onValueChange={v => handleAvailChange(v as any)}>
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
                <Select value={filterPriced} onValueChange={v => handlePricedChange(v as any)}>
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
                            onClick={() => handleCategoryChange("all")}
                        >
                            {filterCategories.find(c => c.id === filterCategory)?.name}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {filterBrand !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handleBrandChange("all")}
                        >
                            {filterBrand}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {filterAvail !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handleAvailChange("all")}
                        >
                            {filterAvail === "available" ? "متوفر" : "غير متوفر"}
                            <X className="h-2.5 w-2.5" />
                        </Badge>
                    )}
                    {filterPriced !== "all" && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] h-6 pr-1 pl-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handlePricedChange("all")}
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
                            <RotateCcw className="h-3 w-3 ml-1" />
                            مسح الكل
                        </Button>
                    )}
                </div>

                {/* Loading indicator in filter bar */}
                {isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                )}
            </div>

            {/* ── Table ─────────────────────────────────────── */}
            <div className={cn("transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
                <DataTable
                    columns={columns}
                    data={products}
                    showSearch={false}
                    groupingOptions={[
                        { id: "brand",       label: "البراند" },
                        { id: "isAvailable", label: "الحالة" },
                    ]}
                    renderSubComponent={({ row }) => {
                        const product = row.original as any
                        const primaryPrice  = product.productPrices?.[0]?.value || null
                        const primaryImage  = product.mediaImages?.find((img: any) => img.isPrimary)?.url
                            || product.mediaImages?.[0]?.url

                        const variantsWithDefaults = (product.variants || []).map((v: any) => ({
                            ...v,
                            price: v.price ?? primaryPrice,
                            images: v.images?.length > 0 ? v.images : (primaryImage ? [{ url: primaryImage }] : []),
                            imageCount: v.imageCount > 0 ? v.imageCount : (primaryImage ? 1 : 0),
                        }))

                        return <VariantsList variants={variantsWithDefaults} />
                    }}
                    globalFilterFn={customGlobalFilterFn}
                    onRefresh={onRefresh}
                />
            </div>

            {/* ── Pagination ────────────────────────────────── */}
            <ServerPagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                limitOptions={[25, 50, 100, 200]}
                className="pt-1"
            />
        </div>
    )
}
