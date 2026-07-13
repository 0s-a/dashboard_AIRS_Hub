import { cn } from "@/lib/utils"
import type { Column } from "@tanstack/react-table"
import { isActionsColumn } from "./column-styles"

/** Sticky actions column — in RTL the last column sits on the physical left */
export function getStickyActionsClass<TData>(
    column: Column<TData, unknown>,
    variant: "header" | "body" = "body",
): string | undefined {
    if (!isActionsColumn(column)) return undefined

    return cn(
        "sticky left-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]",
        variant === "header" ? "z-30 bg-muted/80 backdrop-blur-md" : "z-20 bg-background",
    )
}
