"use client"

import type { Column } from "@tanstack/react-table"
import { ListFilter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FilterOption } from "@/components/ui/column-filter-types"
import { filterInputBase } from "./styles"

export function SelectFilterInput<TData>({
    column,
    options,
}: {
    column: Column<TData, unknown>
    options: FilterOption[]
}) {
    const filterValue = (column.getFilterValue() ?? "") as string

    return (
        <div className="relative group/filter h-10">
            <ListFilter className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 pointer-events-none z-10" />
            <select
                value={filterValue}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                className={cn(
                    filterInputBase,
                    "pr-6 pl-5 appearance-none cursor-pointer",
                    filterValue && "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
                )}
            >
                <option value="">الكل</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {filterValue && (
                <button
                    type="button"
                    onClick={() => column.setFilterValue(undefined)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}
