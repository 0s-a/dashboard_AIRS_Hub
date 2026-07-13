"use client"

import { useCallback, useEffect, useRef, useState, useTransition, useMemo } from "react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "@/components/products/columns"
import { ServerPagination } from "@/components/ui/server-pagination"
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

interface ProductsTableProps {
    initialProducts: SerializedProduct[]
    initialPagination: PaginationMeta
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
}: ProductsTableProps) {
    const [isPending, startTransition] = useTransition()
    const [products, setProducts] = useState(initialProducts)
    const [pagination, setPagination] = useState<PaginationMeta>(initialPagination)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(initialPagination.limit)
    const [categoryId, setCategoryId] = useState<string | undefined>()
    const [brandId, setBrandId] = useState<string | undefined>()

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
            return col
        })
    }, [filterCategories, filterBrands])

    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const filtersRef = useRef({ search, page, limit, categoryId, brandId })

    useEffect(() => {
        filtersRef.current = { search, page, limit, categoryId, brandId }
    }, [search, page, limit, categoryId, brandId])

    useEffect(() => {
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current)
        }
    }, [])

    const fetchProducts = useCallback((params: {
        search?: string
        categoryId?: string
        brandId?: string
        page?: number
        limit?: number
    }) => {
        startTransition(async () => {
            const res = await getProductsPaginated({
                search: params.search,
                categoryId: params.categoryId,
                brandId: params.brandId,
                page: params.page ?? 1,
                limit: params.limit ?? limit,
                sortBy: "createdAt",
                sortDir: "desc",
            })
            if (res.success) {
                setProducts(res.data)
                setPagination(res.pagination)
            }
        })
    }, [limit])

    const currentFilters = useCallback(() => {
        const f = filtersRef.current
        return {
            search: f.search || undefined,
            categoryId: f.categoryId,
            brandId: f.brandId,
            limit: f.limit,
        }
    }, [])

    const handleSearchChange = (value: string) => {
        setSearch(value)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            setPage(1)
            fetchProducts({ ...currentFilters(), search: value || undefined, page: 1 })
        }, SEARCH_DEBOUNCE_MS)
    }

    const handleColumnFiltersChange = (filters: ColumnFiltersState) => {
        const nextBrand = filters.find(f => f.id === "brand")?.value as string | undefined
        const nextCategory = filters.find(f => f.id === "category")?.value as string | undefined
        setBrandId(nextBrand)
        setCategoryId(nextCategory)
        setPage(1)
        fetchProducts({
            ...currentFilters(),
            brandId: nextBrand,
            categoryId: nextCategory,
            page: 1,
        })
    }

    const handleProductDeleted = useCallback(() => {
        const f = filtersRef.current
        fetchProducts({
            search: f.search || undefined,
            categoryId: f.categoryId,
            brandId: f.brandId,
            limit: f.limit,
            page: f.page,
        })
        void onRefresh?.()
    }, [fetchProducts, onRefresh])

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

    return (
        <DataTable
            mode="server"
            columns={tableColumns}
            data={products}
            searchPlaceholder="ابحث بالاسم، رقم الصنف، اللون، البراند، التصنيف..."
            searchValue={search}
            onSearchChange={handleSearchChange}
            onColumnFiltersChange={handleColumnFiltersChange}
            isLoading={isPending}
            totalCount={pagination.total}
            onRefresh={handleProductDeleted}
            footerContent={
                <ServerPagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                    limitOptions={[10, 25, 50, 100, 200]}
                    itemLabel="منتج"
                    className="border-0 bg-transparent shadow-none rounded-none py-4 px-4"
                />
            }
        />
    )
}
