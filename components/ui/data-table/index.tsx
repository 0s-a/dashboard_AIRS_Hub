"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ColumnFiltersState,
    getCoreRowModel,
    useReactTable,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    SortingState,
    GroupingState,
    ExpandedState,
    type Updater,
} from "@tanstack/react-table"
import type { DataTableProps } from "./types"
import { dataTableFilterFns } from "./filter-fns"
import { DataTableToolbar } from "./toolbar"
import { DataTableBody } from "./table-body"
import { ClientPagination } from "./client-pagination"

const coreRowModel = getCoreRowModel()
const filteredRowModel = getFilteredRowModel()
const paginationRowModel = getPaginationRowModel()
const sortedRowModel = getSortedRowModel()
const groupedRowModel = getGroupedRowModel()
const expandedRowModel = getExpandedRowModel()

export type { DataTableProps, DataTableMeta, GroupingOption } from "./types"
export { dataTableFilterFns } from "./filter-fns"

export function DataTable<TData, TValue>({
    columns,
    data,
    searchPlaceholder = "ابحث...",
    showSearch = true,
    showPagination = true,
    totalCount,
    groupingOptions = [],
    renderSubComponent,
    globalFilterFn,
    onRefresh,
    footerContent,
    getRowClassName,
    mode = "client",
    searchValue,
    onSearchChange,
    onColumnFiltersChange: onColumnFiltersChangeProp,
    isLoading = false,
}: DataTableProps<TData, TValue>) {
    const isServer = mode === "server"
    const effectiveShowPagination = isServer ? false : showPagination

    const [isMounted, setIsMounted] = React.useState(false)
    const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("")
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [grouping, setGrouping] = React.useState<GroupingState>([])
    const [expanded, setExpanded] = React.useState<ExpandedState>({})
    const [isRefreshing, setIsRefreshing] = React.useState(false)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const router = useRouter()

    const isControlledSearch = searchValue !== undefined
    const globalFilter = isControlledSearch ? searchValue : internalGlobalFilter

    const setGlobalFilter = React.useCallback((value: string) => {
        if (isControlledSearch) {
            onSearchChange?.(value)
        } else {
            setInternalGlobalFilter(value)
            onSearchChange?.(value)
        }
    }, [isControlledSearch, onSearchChange])

    const handleColumnFiltersChange = React.useCallback((updater: Updater<ColumnFiltersState>) => {
        setColumnFilters((prev) => {
            const next = typeof updater === "function" ? updater(prev) : updater
            onColumnFiltersChangeProp?.(next)
            return next
        })
    }, [onColumnFiltersChangeProp])

    const handleRefresh = React.useCallback(async () => {
        if (isRefreshing) return
        setIsRefreshing(true)
        try {
            if (onRefresh) {
                await onRefresh()
            } else {
                router.refresh()
            }
        } finally {
            setTimeout(() => setIsRefreshing(false), 600)
        }
    }, [onRefresh, isRefreshing, router])

    React.useEffect(() => { setIsMounted(true) }, [])

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const activeFilterCount = columnFilters.length

    const clearAllColumnFilters = React.useCallback(() => {
        setColumnFilters([])
        onColumnFiltersChangeProp?.([])
    }, [onColumnFiltersChangeProp])

    const clearSearchAndFilters = React.useCallback(() => {
        setGlobalFilter("")
        clearAllColumnFilters()
    }, [setGlobalFilter, clearAllColumnFilters])

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: "onChange",
        defaultColumn: { size: 150, minSize: 60, maxSize: 500 },
        filterFns: dataTableFilterFns,
        state: {
            globalFilter,
            columnFilters,
            sorting,
            grouping,
            expanded,
        },
        meta: {
            onRefresh: handleRefresh,
        },
        onGlobalFilterChange: (updater) => {
            const next = typeof updater === "function" ? updater(globalFilter) : updater
            setGlobalFilter(next ?? "")
        },
        onColumnFiltersChange: handleColumnFiltersChange,
        onSortingChange: setSorting,
        onGroupingChange: setGrouping,
        onExpandedChange: setExpanded,
        manualPagination: isServer || !effectiveShowPagination,
        manualFiltering: isServer,
        getCoreRowModel: coreRowModel,
        getFilteredRowModel: isServer ? undefined : filteredRowModel,
        getPaginationRowModel: paginationRowModel,
        getSortedRowModel: sortedRowModel,
        getGroupedRowModel: groupedRowModel,
        getExpandedRowModel: expandedRowModel,
        getRowCanExpand: () => true,
        ...(globalFilterFn && { globalFilterFn }),
    })

    if (!isMounted) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="h-11 flex-1 max-w-md rounded-xl bg-muted/40" />
                </div>
                <div className="card-premium overflow-hidden">
                    <div className="h-10 bg-muted/30" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 border-t border-border/40 bg-muted/10" />
                    ))}
                </div>
                <div className="h-10 rounded-lg bg-muted/20" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <DataTableToolbar
                showSearch={showSearch}
                searchPlaceholder={searchPlaceholder}
                searchInputRef={searchInputRef}
                globalFilter={globalFilter ?? ""}
                onGlobalFilterChange={setGlobalFilter}
                groupingOptions={groupingOptions}
                grouping={grouping}
                onGroupingChange={setGrouping}
                activeFilterCount={activeFilterCount}
                onClearColumnFilters={clearAllColumnFilters}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                totalCount={totalCount}
                dataLength={data.length}
                isLoading={isLoading}
            />

            <DataTableBody
                table={table}
                columns={columns}
                globalFilter={globalFilter ?? ""}
                activeFilterCount={activeFilterCount}
                onClearSearchAndFilters={clearSearchAndFilters}
                renderSubComponent={renderSubComponent}
                getRowClassName={getRowClassName}
                footerContent={footerContent}
                isLoading={isLoading}
            />

            {effectiveShowPagination && (
                <ClientPagination
                    table={table}
                    totalCount={totalCount}
                    dataLength={data.length}
                />
            )}
        </div>
    )
}
