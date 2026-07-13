import type { RowData } from "@tanstack/react-table"
import type { ColumnFilterMeta } from "@/components/ui/column-filter-types"
import type { DataTableMeta } from "@/components/ui/data-table/types"
import type { dataTableFilterFns } from "@/components/ui/data-table/filter-fns"

declare module "@tanstack/react-table" {
    interface ColumnMeta<TData extends RowData, TValue> extends ColumnFilterMeta {
        /** Ensures interface is distinct from an empty extension (lint) */
        __nawaatColumn?: TData | TValue
    }

    interface TableMeta<TData extends RowData> extends DataTableMeta {
        __nawaatRow?: TData
    }

    interface FilterFns {
        dateRange: typeof dataTableFilterFns.dateRange
        numberRange: typeof dataTableFilterFns.numberRange
        boolean: typeof dataTableFilterFns.boolean
        select: typeof dataTableFilterFns.select
    }
}

export {}
