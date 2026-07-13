import type * as React from "react"
import type { ColumnDef, ColumnFiltersState, Row } from "@tanstack/react-table"

export interface GroupingOption {
    id: string
    label: string
}

export interface DataTableMeta {
    onRefresh?: () => void | Promise<void>
}

export interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchPlaceholder?: string
    showSearch?: boolean
    showPagination?: boolean
    /** @deprecated Column filters are always shown; kept for API compatibility */
    showColumnFilters?: boolean
    totalCount?: number
    groupingOptions?: GroupingOption[]
    renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement
    globalFilterFn?: (row: Row<TData>, columnId: string, filterValue: string) => boolean
    onRefresh?: () => void | Promise<void>
    footerContent?: React.ReactNode
    getRowClassName?: (row: TData) => string | undefined
    /** client = local filter/paginate; server = parent owns fetch */
    mode?: "client" | "server"
    searchValue?: string
    onSearchChange?: (value: string) => void
    onColumnFiltersChange?: (filters: ColumnFiltersState) => void
    isLoading?: boolean
}
