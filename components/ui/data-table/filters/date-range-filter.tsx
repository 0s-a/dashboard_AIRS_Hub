"use client"

import type { Column } from "@tanstack/react-table"
import { Calendar, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DateRangeFilterValue } from "../filter-fns"
import { filterInputBase } from "./styles"

export function DateRangeFilter<TData>({ column }: { column: Column<TData, unknown> }) {
    const filterValue = (column.getFilterValue() ?? { from: "", to: "" }) as DateRangeFilterValue & {
        from: string
        to: string
    }

    const updateFilter = (key: "from" | "to", value: string) => {
        const next = { ...filterValue, [key]: value }
        if (!next.from && !next.to) {
            column.setFilterValue(undefined)
        } else {
            column.setFilterValue(next)
        }
    }

    const hasValue = Boolean(filterValue.from || filterValue.to)

    return (
        <div className="flex items-center gap-0.5 h-7">
            <div className="relative flex-1 group/filter">
                <Calendar className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
                <input
                    type="date"
                    value={filterValue.from ?? ""}
                    onChange={(e) => updateFilter("from", e.target.value)}
                    className={cn(
                        filterInputBase,
                        "pr-5 pl-1 text-[10px]",
                        hasValue && "border-primary/50 bg-primary/5"
                    )}
                />
            </div>
            <div className="relative flex-1 group/filter">
                <Calendar className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
                <input
                    type="date"
                    value={filterValue.to ?? ""}
                    onChange={(e) => updateFilter("to", e.target.value)}
                    className={cn(
                        filterInputBase,
                        "pr-5 pl-1 text-[10px]",
                        hasValue && "border-primary/50 bg-primary/5"
                    )}
                />
            </div>
            {hasValue && (
                <button
                    type="button"
                    onClick={() => column.setFilterValue(undefined)}
                    className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}
