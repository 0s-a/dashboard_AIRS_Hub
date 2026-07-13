"use client"

import type { Column } from "@tanstack/react-table"
import { Check, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BooleanFilterLabels, ColumnFilterMeta } from "@/components/ui/column-filter-types"

export function BooleanFilter<TData>({ column }: { column: Column<TData, unknown> }) {
    const filterValue = column.getFilterValue() as string | undefined
    const meta = column.columnDef.meta as ColumnFilterMeta | undefined
    const labels: BooleanFilterLabels = meta?.booleanLabels ?? {
        true: "نشط",
        false: "غير نشط",
        all: "الكل",
    }

    const options = [
        { value: undefined as string | undefined, label: labels.all ?? "الكل", icon: null },
        { value: "true", label: labels.true, icon: Check },
        { value: "false", label: labels.false, icon: XCircle },
    ]

    return (
        <div className="flex items-center gap-1 h-10">
            {options.map((opt) => {
                const isActive = filterValue === opt.value
                const Icon = opt.icon
                return (
                    <button
                        type="button"
                        key={opt.label}
                        onClick={() => column.setFilterValue(opt.value)}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                            isActive
                                ? opt.value === "true"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                                    : opt.value === "false"
                                        ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 shadow-sm"
                                        : "bg-primary/10 text-primary border border-primary/30 shadow-sm"
                                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 border border-transparent"
                        )}
                    >
                        {Icon && <Icon className="h-2.5 w-2.5" />}
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}
