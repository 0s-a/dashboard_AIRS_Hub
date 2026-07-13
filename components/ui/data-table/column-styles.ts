import { cn } from "@/lib/utils"
import type { Column } from "@tanstack/react-table"
import type { ColumnFilterMeta } from "@/components/ui/column-filter-types"

export function getColumnMeta<TData>(column: Column<TData, unknown>): ColumnFilterMeta | undefined {
    return column.columnDef.meta as ColumnFilterMeta | undefined
}

export function isActionsColumn<TData>(column: Column<TData, unknown>): boolean {
    const meta = getColumnMeta(column)
    return column.id === "actions" || meta?.sticky === "actions" || meta?.cellVariant === "actions"
}

export function getAlignClass(meta?: ColumnFilterMeta): string {
    const align = meta?.align
        ?? (meta?.cellVariant === "number" || meta?.cellVariant === "actions" ? "end" : "start")

    switch (align) {
        case "center":
            return "text-center"
        case "end":
            return "text-end"
        default:
            return "text-start"
    }
}

export function getCellVariantClass(meta?: ColumnFilterMeta): string {
    switch (meta?.cellVariant) {
        case "number":
            return "tabular-nums"
        case "code":
            return "font-mono text-xs"
        case "actions":
            return "whitespace-nowrap"
        default:
            return ""
    }
}

export function getHeaderCellClass<TData>(column: Column<TData, unknown>, extra?: string): string {
    const meta = getColumnMeta(column)
    return cn(getAlignClass(meta), getCellVariantClass(meta), extra)
}

export function getBodyCellClass<TData>(column: Column<TData, unknown>, extra?: string): string {
    const meta = getColumnMeta(column)
    return cn(
        getAlignClass(meta),
        getCellVariantClass(meta),
        meta?.cellVariant === "text" && "min-w-0",
        extra,
    )
}

export function getCellDir(meta?: ColumnFilterMeta): "ltr" | undefined {
    if (meta?.cellVariant === "number" || meta?.cellVariant === "code") return "ltr"
    return undefined
}
