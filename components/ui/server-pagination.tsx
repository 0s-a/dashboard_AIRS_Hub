"use client"

import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PaginationMeta } from "@/lib/actions/inventory"

interface ServerPaginationProps {
    pagination: PaginationMeta
    onPageChange: (page: number) => void
    onLimitChange?: (limit: number) => void
    limitOptions?: number[]
    className?: string
}

export function ServerPagination({
    pagination,
    onPageChange,
    onLimitChange,
    limitOptions = [25, 50, 100, 200],
    className,
}: ServerPaginationProps) {
    const { page, limit, total, pages, hasPrev, hasNext } = pagination

    if (total === 0) return null

    // Build visible page numbers (max 5 around current)
    const getPageNumbers = () => {
        const delta = 2
        const range: number[] = []
        const rangeWithDots: (number | "...")[] = []

        for (
            let i = Math.max(2, page - delta);
            i <= Math.min(pages - 1, page + delta);
            i++
        ) {
            range.push(i)
        }

        if (page - delta > 2) rangeWithDots.push(1, "...")
        else rangeWithDots.push(1)

        rangeWithDots.push(...range)

        if (page + delta < pages - 1) rangeWithDots.push("...", pages)
        else if (pages > 1) rangeWithDots.push(pages)

        return rangeWithDots
    }

    const start = (page - 1) * limit + 1
    const end   = Math.min(page * limit, total)

    return (
        <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
            {/* ── Left: count + limit selector ── */}
            <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                    عرض{" "}
                    <span className="font-bold text-foreground">{start}–{end}</span>
                    {" "}من{" "}
                    <span className="font-bold text-foreground">{total.toLocaleString("ar-EG")}</span>
                    {" "}منتج
                </span>

                {onLimitChange && (
                    <Select
                        value={String(limit)}
                        onValueChange={(v) => onLimitChange(Number(v))}
                    >
                        <SelectTrigger className="h-8 w-[90px] text-xs rounded-lg border-border/50 bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {limitOptions.map((l) => (
                                <SelectItem key={l} value={String(l)} className="text-xs rounded-lg">
                                    {l} / صفحة
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* ── Right: page controls ── */}
            {pages > 1 && (
                <div className="flex items-center gap-1">
                    {/* First */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onPageChange(1)}
                        disabled={!hasPrev}
                        title="الصفحة الأولى"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>

                    {/* Prev */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onPageChange(page - 1)}
                        disabled={!hasPrev}
                        title="السابقة"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-0.5">
                        {getPageNumbers().map((p, idx) =>
                            p === "..." ? (
                                <span
                                    key={`dots-${idx}`}
                                    className="w-8 text-center text-xs text-muted-foreground select-none"
                                >
                                    …
                                </span>
                            ) : (
                                <Button
                                    key={p}
                                    variant={p === page ? "default" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 rounded-lg text-xs font-bold",
                                        p === page
                                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    onClick={() => onPageChange(p as number)}
                                >
                                    {p}
                                </Button>
                            )
                        )}
                    </div>

                    {/* Next */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onPageChange(page + 1)}
                        disabled={!hasNext}
                        title="التالية"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Last */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onPageChange(pages)}
                        disabled={!hasNext}
                        title="الصفحة الأخيرة"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
