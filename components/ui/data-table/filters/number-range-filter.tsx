"use client"

import type { Column } from "@tanstack/react-table"
import { Hash, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NumberRangeFilterValue } from "../filter-fns"
import { filterInputBase } from "./styles"

export function NumberRangeFilter<TData>({ column }: { column: Column<TData, unknown> }) {
    const filterValue = (column.getFilterValue() ?? { min: "", max: "" }) as NumberRangeFilterValue & {
        min: string
        max: string
    }

    const updateFilter = (key: "min" | "max", value: string) => {
        const next = { ...filterValue, [key]: value }
        if (!next.min && !next.max) {
            column.setFilterValue(undefined)
        } else {
            column.setFilterValue(next)
        }
    }

    const hasValue = Boolean(filterValue.min || filterValue.max)

    return (
        <div className="flex items-center gap-0.5 h-7">
            <div className="relative flex-1 group/filter">
                <Hash className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
                <input
                    type="number"
                    value={filterValue.min ?? ""}
                    onChange={(e) => updateFilter("min", e.target.value)}
                    placeholder="من"
                    className={cn(
                        filterInputBase,
                        "pr-5 pl-1 text-[10px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                        hasValue && "border-primary/50 bg-primary/5"
                    )}
                />
            </div>
            <div className="relative flex-1 group/filter">
                <Hash className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
                <input
                    type="number"
                    value={filterValue.max ?? ""}
                    onChange={(e) => updateFilter("max", e.target.value)}
                    placeholder="إلى"
                    className={cn(
                        filterInputBase,
                        "pr-5 pl-1 text-[10px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
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
