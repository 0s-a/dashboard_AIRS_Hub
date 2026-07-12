"use client"

import { useCallback, useEffect, useRef, useState, useTransition, useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "@/components/products/columns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ServerPagination } from "@/components/ui/server-pagination"
import { Input } from "@/components/ui/input"
import {
    X,
    Search,
    Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getProductsPaginated } from "@/lib/actions/inventory"
import type { PaginationMeta, SerializedProduct } from "@/lib/actions/inventory"

interface FilterOption {
    id: string
    name: string
}

interface BrandOption {
    id: string
    name: string
    code: string | null
}

interface InventoryTableProps {
    // Initial SSR data
    initialProducts: SerializedProduct[]
    initialPagination: PaginationMeta
    // Filter options (fetched server-side once)
    filterCategories: FilterOption[]
    filterBrands: BrandOption[]
    onRefresh?: () => void | Promise<void>
}

const SEARCH_DEBOUNCE_MS = 350

export function ProductsTable({
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

    // ── Pagination state ──────────────────────────────────────
    const [page, setPage]   = useState(1)
    const [limit, setLimit] = useState(initialPagination.limit)

    // ── Inject dynamic filter options into columns ──────────────
    const tableColumns = useMemo(() => {
        return columns.map(col => {
            if (col.id === "category") {
                return {
                    ...col,
                    meta: {
                        ...col.meta,
                        filterOptions: (filterCategories || []).map(c => ({ label: c.name, value: c.id }))
                    }
                }
            }
            if (col.id === "brand") {
                return {
                    ...col,
                    meta: {
                        ...col.meta,
                        filterOptions: (filterBrands || []).map(b => ({ label: b.name, value: b.id }))
                    }
                }
            }
            return col
        })
    }, [filterCategories, filterBrands])

    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Refs for latest filter values (avoids stale closures) ──
    const filtersRef = useRef({ search, page, limit })
    filtersRef.current = { search, page, limit }

    useEffect(() => { setIsMounted(true) }, [])

    // ── Cleanup debounce timer on unmount ─────────────────────
    useEffect(() => {
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current)
        }
    }, [])

    // ── Core fetch function ──────────────────────────────────
    const fetchProducts = useCallback((params: {
        search?: string
        categoryId?: string
        brandId?: string
        hasPrices?: boolean
        page?: number
        limit?: number
    }) => {
        startTransition(async () => {
            const res = await getProductsPaginated({
                search:      params.search,
                categoryId:  params.categoryId,
                brandId:     params.brandId,
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

    const handleProductDeleted = useCallback(() => {
        const f = filtersRef.current
        fetchProducts({
            search: f.search || undefined,
            limit: f.limit,
            page:  f.page,
        })
    }, [fetchProducts])

    // ── Helpers: build complete filter params from current state ────────────
    // Uses filtersRef to always read the latest values (no stale closures)
    const currentFilters = useCallback(() => {
        const f = filtersRef.current
        return {
            search: f.search || undefined,
            limit: f.limit,
        }
    }, [])

    // ── Search debounce ──────────────────────────────────────
    const handleSearchChange = (value: string) => {
        setSearch(value)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            setPage(1)
            fetchProducts({ ...currentFilters(), search: value || undefined, page: 1 })
        }, SEARCH_DEBOUNCE_MS)
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



            {/* ── Table ─────────────────────────────────────── */}
            <div className={cn("transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
                <DataTable
                    columns={tableColumns}
                    data={products}
                    showSearch={false}
                    showPagination={false}
                    totalCount={pagination.total}
                    renderSubComponent={({ row }) => {
                        const product = row.original as SerializedProduct
                        return (
                            <div className="px-4 py-3 flex items-center justify-between bg-muted/20 rounded-lg">
                                <span className="text-sm text-muted-foreground">
                                    {product.skcCount ?? product.skcs?.length ?? 0} صنف مرتبط بهذا المنتج
                                </span>
                                <Link href={`/items?productId=${product.id}`}>
                                    <Button size="sm" variant="outline">عرض الأصناف</Button>
                                </Link>
                            </div>
                        )
                    }}
                    onRefresh={handleProductDeleted}
                    footerContent={
                        <ServerPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onLimitChange={handleLimitChange}
                            limitOptions={[10, 25, 50, 100, 200]}
                            className="border-0 bg-transparent shadow-none rounded-none py-4 px-4"
                        />
                    }
                />
            </div>
        </div>
    )
}
