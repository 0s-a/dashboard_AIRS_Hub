"use client"

import { useCallback, useEffect, useRef, useState, useTransition, useMemo } from "react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "@/components/items/columns"
import { ServerPagination } from "@/components/ui/server-pagination"
import { getItemsPaginated } from "@/lib/actions/items"
import type { PaginationMeta, SerializedItem } from "@/lib/actions/items"

interface FilterOption {
    id: string
    name: string
}

interface BrandOption {
    id: string
    name: string
    code: string | null
}

interface ProductOption {
    id: string
    name: string
    code: string
}

interface ItemsTableProps {
    initialItems: SerializedItem[]
    initialPagination: PaginationMeta
    filterCategories: FilterOption[]
    filterBrands: BrandOption[]
    filterProducts: ProductOption[]
    onRefresh?: () => void | Promise<void>
}

const SEARCH_DEBOUNCE_MS = 350

export function ItemsTable({
    initialItems,
    initialPagination,
    filterCategories,
    filterBrands,
    filterProducts,
    onRefresh,
}: ItemsTableProps) {
    const [isPending, startTransition] = useTransition()
    const [items, setItems] = useState(initialItems)
    const [pagination, setPagination] = useState<PaginationMeta>(initialPagination)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(initialPagination.limit)
    const [categoryId, setCategoryId] = useState<string | undefined>()
    const [brandId, setBrandId] = useState<string | undefined>()
    const [productId, setProductId] = useState<string | undefined>()

    const tableColumns = useMemo(() => {
        return columns.map(col => {
            if (col.id === "category") {
                return {
                    ...col,
                    meta: {
                        ...col.meta,
                        filterOptions: (filterCategories || []).map(c => ({ label: c.name, value: c.id })),
                    },
                }
            }
            if (col.id === "brand") {
                return {
                    ...col,
                    meta: {
                        ...col.meta,
                        filterOptions: (filterBrands || []).map(b => ({ label: b.name, value: b.id })),
                    },
                }
            }
            if (col.id === "product") {
                return {
                    ...col,
                    meta: {
                        ...col.meta,
                        filterOptions: (filterProducts || []).map(f => ({
                            label: `${f.name} (${f.code})`,
                            value: f.id,
                        })),
                    },
                }
            }
            return col
        })
    }, [filterCategories, filterBrands, filterProducts])

    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const filtersRef = useRef({ search, page, limit, categoryId, brandId, productId })

    useEffect(() => {
        filtersRef.current = { search, page, limit, categoryId, brandId, productId }
    }, [search, page, limit, categoryId, brandId, productId])

    useEffect(() => {
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current)
        }
    }, [])

    const fetchItems = useCallback((params: {
        search?: string
        categoryId?: string
        brandId?: string
        productId?: string
        page?: number
        limit?: number
    }) => {
        startTransition(async () => {
            try {
                const res = await getItemsPaginated({
                    search: params.search,
                    categoryId: params.categoryId,
                    brandId: params.brandId,
                    productId: params.productId,
                    page: params.page ?? 1,
                    limit: params.limit ?? limit,
                    sortBy: "createdAt",
                    sortDir: "desc",
                })
                if (res.success) {
                    setItems(res.data)
                    setPagination(res.pagination)
                }
            } catch {
                // Stale Server Action IDs after HMR/restart, or auth redirects
            }
        })
    }, [limit])

    const currentFilters = useCallback(() => {
        const f = filtersRef.current
        return {
            search: f.search || undefined,
            categoryId: f.categoryId,
            brandId: f.brandId,
            productId: f.productId,
            limit: f.limit,
        }
    }, [])

    const handleSearchChange = (value: string) => {
        setSearch(value)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            setPage(1)
            fetchItems({ ...currentFilters(), search: value || undefined, page: 1 })
        }, SEARCH_DEBOUNCE_MS)
    }

    const handleColumnFiltersChange = (filters: ColumnFiltersState) => {
        const nextBrand = filters.find(f => f.id === "brand")?.value as string | undefined
        const nextCategory = filters.find(f => f.id === "category")?.value as string | undefined
        const nextProduct = filters.find(f => f.id === "product")?.value as string | undefined
        setBrandId(nextBrand)
        setCategoryId(nextCategory)
        setProductId(nextProduct)
        setPage(1)
        fetchItems({
            ...currentFilters(),
            brandId: nextBrand,
            categoryId: nextCategory,
            productId: nextProduct,
            page: 1,
        })
    }

    const handleItemDeleted = useCallback(() => {
        const f = filtersRef.current
        fetchItems({
            search: f.search || undefined,
            categoryId: f.categoryId,
            brandId: f.brandId,
            productId: f.productId,
            limit: f.limit,
            page: f.page,
        })
        void onRefresh?.()
    }, [fetchItems, onRefresh])

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        fetchItems({ ...currentFilters(), page: newPage })
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit)
        setPage(1)
        fetchItems({ ...currentFilters(), limit: newLimit, page: 1 })
    }

    return (
        <DataTable
            mode="server"
            columns={tableColumns}
            data={items}
            searchPlaceholder="ابحث بالاسم، رقم الصنف، البراند، التصنيف، المنتج..."
            searchValue={search}
            onSearchChange={handleSearchChange}
            onColumnFiltersChange={handleColumnFiltersChange}
            isLoading={isPending}
            totalCount={pagination.total}
            onRefresh={handleItemDeleted}
            footerContent={
                <ServerPagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                    limitOptions={[10, 25, 50, 100, 200]}
                    itemLabel="صنف"
                    className="border-0 bg-transparent shadow-none rounded-none py-4 px-4"
                />
            }
        />
    )
}
