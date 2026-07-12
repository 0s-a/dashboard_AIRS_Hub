"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getItemsPaginated } from "@/lib/actions/item"
import type { SerializedItemList } from "@/lib/types/item"
import { Search, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

import { DataTable } from "@/components/ui/data-table"
import { ServerPagination } from "@/components/ui/server-pagination"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { buildItemColumns } from "@/components/items/item-columns"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"

export type ItemsFilterOptions = {
    categories: { id: string; name: string; icon: string | null; code: string }[]
    brands: { id: string; name: string; code: string }[]
}

type PaginationState = {
    page: number
    limit: number
    total: number
    pages: number
    hasPrev: boolean
    hasNext: boolean
}

const SEARCH_DEBOUNCE_MS = 350

export function ItemsTable({
    initialItems,
    initialPagination,
    productId,
    productName,
    filterOptions,
}: {
    initialItems: SerializedItemList[]
    initialPagination: PaginationState
    productId?: string
    productName?: string
    filterOptions?: ItemsFilterOptions
}) {
    const router = useRouter()
    const [items, setItems] = useState(initialItems)
    const [pagination, setPagination] = useState(initialPagination)
    const [search, setSearch] = useState("")
    const [categoryId, setCategoryId] = useState("all")
    const [brandId, setBrandId] = useState("all")
    const [availability, setAvailability] = useState("all")
    const [isPending, startTransition] = useTransition()
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        setItems(initialItems)
        setPagination(initialPagination)
    }, [initialItems, initialPagination])

    useEffect(() => {
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current)
        }
    }, [])

    const buildFilterParams = useCallback((cat: string, brand: string, avail: string) => ({
        categoryId: cat !== "all" ? cat : undefined,
        brandId: brand !== "all" ? brand : undefined,
        isAvailable: avail === "all" ? undefined : avail === "true",
    }), [])

    const fetchItems = useCallback((
        page: number,
        limit: number,
        q: string,
        cat: string,
        brand: string,
        avail: string,
    ) => {
        startTransition(async () => {
            const res = await getItemsPaginated({
                page,
                limit,
                search: q || undefined,
                productId,
                ...buildFilterParams(cat, brand, avail),
            })
            if (res.success) {
                setItems(res.data)
                setPagination(res.pagination)
            }
        })
    }, [productId, buildFilterParams])

    const handleRefresh = useCallback(() => {
        fetchItems(pagination.page, pagination.limit, search, categoryId, brandId, availability)
        router.refresh()
    }, [fetchItems, pagination.page, pagination.limit, search, categoryId, brandId, availability, router])

    const columns = useMemo(() => buildItemColumns(handleRefresh), [handleRefresh])

    const applyFilters = useCallback((
        q: string,
        cat: string,
        brand: string,
        avail: string,
        pageLimit: number,
        immediate = false,
    ) => {
        const run = () => fetchItems(1, pageLimit, q, cat, brand, avail)
        if (immediate) {
            run()
            return
        }
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(run, SEARCH_DEBOUNCE_MS)
    }, [fetchItems])

    return (
        <div className="space-y-4">
            {productId && productName && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-sm">
                        عرض {INVENTORY_LABELS.items.toLowerCase()}: <span className="font-semibold">{productName}</span>
                    </p>
                    <Button variant="ghost" size="sm" className="gap-1 shrink-0" asChild>
                        <Link href="/items">
                            <X className="h-4 w-4" />
                            عرض الكل
                        </Link>
                    </Button>
                </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ابحث بالمنتج، اللون، المواصفة، أو الكود..."
                        className="pr-10"
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value)
                            applyFilters(e.target.value, categoryId, brandId, availability, pagination.limit)
                        }}
                    />
                </div>
                {filterOptions && (
                    <>
                        <Select value={categoryId} onValueChange={v => {
                            setCategoryId(v)
                            applyFilters(search, v, brandId, availability, pagination.limit, true)
                        }}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="التصنيف" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل التصنيفات</SelectItem>
                                {filterOptions.categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={brandId} onValueChange={v => {
                            setBrandId(v)
                            applyFilters(search, categoryId, v, availability, pagination.limit, true)
                        }}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="البراند" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل البراندات</SelectItem>
                                {filterOptions.brands.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                )}
                <Select value={availability} onValueChange={v => {
                    setAvailability(v)
                    applyFilters(search, categoryId, brandId, v, pagination.limit, true)
                }}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="التوفر" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="true">متوفر</SelectItem>
                        <SelectItem value="false">غير متوفر</SelectItem>
                    </SelectContent>
                </Select>
                {isPending && <Loader2 className="h-4 w-4 animate-spin self-center" />}
            </div>
            <div className={cn(isPending && "opacity-60")}>
                <DataTable columns={columns} data={items} showSearch={false} showPagination={false} />
                <ServerPagination
                    pagination={pagination}
                    onPageChange={p => fetchItems(p, pagination.limit, search, categoryId, brandId, availability)}
                    onLimitChange={l => fetchItems(1, l, search, categoryId, brandId, availability)}
                />
            </div>
        </div>
    )
}
