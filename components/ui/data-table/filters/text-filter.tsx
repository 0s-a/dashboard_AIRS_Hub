"use client"

import type { Column } from "@tanstack/react-table"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { filterInputBase } from "./styles"

export function TextFilter<TData>({
    column,
    placeholder,
}: {
    column: Column<TData, unknown>
    placeholder?: string
}) {
    const filterValue = (column.getFilterValue() ?? "") as string

    return (
        <div className="relative group/filter">
            <Search className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 group-focus-within/filter:text-primary/60 transition-colors pointer-events-none" />
            <input
                type="text"
                value={filterValue}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                placeholder={placeholder ?? "فلتر..."}
                className={cn(
                    filterInputBase,
                    "pr-6 pl-6",
                    filterValue && "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
                )}
            />
            {filterValue && (
                <button
                    type="button"
                    onClick={() => column.setFilterValue(undefined)}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}
