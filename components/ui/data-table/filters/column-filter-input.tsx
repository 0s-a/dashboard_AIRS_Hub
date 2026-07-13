"use client"

import type { Column } from "@tanstack/react-table"
import type { ColumnFilterMeta } from "@/components/ui/column-filter-types"
import { TextFilter } from "./text-filter"
import { BooleanFilter } from "./boolean-filter"
import { SelectFilterInput } from "./select-filter"
import { DateRangeFilter } from "./date-range-filter"
import { NumberRangeFilter } from "./number-range-filter"

export function ColumnFilterInput<TData>({ column }: { column: Column<TData, unknown> }) {
    const meta = column.columnDef.meta as ColumnFilterMeta | undefined
    const filterType = meta?.filterType ?? "text"

    switch (filterType) {
        case "boolean":
            return <BooleanFilter column={column} />
        case "select":
            return <SelectFilterInput column={column} options={meta?.filterOptions ?? []} />
        case "date-range":
            return <DateRangeFilter column={column} />
        case "number-range":
            return <NumberRangeFilter column={column} />
        default:
            return <TextFilter column={column} placeholder={meta?.filterPlaceholder} />
    }
}
