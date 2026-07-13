"use client"

import type { RefObject } from "react"
import type { GroupingState } from "@tanstack/react-table"
import { Search, X, Layers, RefreshCcw, FilterX } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { GroupingOption } from "./types"

interface DataTableToolbarProps {
    showSearch: boolean
    searchPlaceholder: string
    searchInputRef: RefObject<HTMLInputElement | null>
    globalFilter: string
    onGlobalFilterChange: (value: string) => void
    groupingOptions: GroupingOption[]
    grouping: GroupingState
    onGroupingChange: (value: GroupingState) => void
    activeFilterCount: number
    onClearColumnFilters: () => void
    onRefresh: () => void
    isRefreshing: boolean
    totalCount?: number
    dataLength: number
    isLoading?: boolean
}

export function DataTableToolbar({
    showSearch,
    searchPlaceholder,
    searchInputRef,
    globalFilter,
    onGlobalFilterChange,
    groupingOptions,
    grouping,
    onGroupingChange,
    activeFilterCount,
    onClearColumnFilters,
    onRefresh,
    isRefreshing,
    totalCount,
    dataLength,
    isLoading,
}: DataTableToolbarProps) {
    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-4">
                {showSearch && (
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        {isLoading && (
                            <span className="absolute left-10 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        )}
                        <Input
                            ref={searchInputRef}
                            placeholder={searchPlaceholder}
                            value={globalFilter ?? ""}
                            onChange={(e) => onGlobalFilterChange(e.target.value)}
                            className="pr-10 pl-12 h-9 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                        />
                        {globalFilter && (
                            <button
                                type="button"
                                onClick={() => onGlobalFilterChange("")}
                                className="absolute left-10 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] text-muted-foreground font-medium pointer-events-none group-focus-within:opacity-0 transition-opacity">
                            <span className="text-[12px]">/</span>
                        </div>
                    </div>
                )}

                {groupingOptions.length > 0 && (
                    <div className="flex items-center gap-2 min-w-[180px]">
                        <Select
                            value={grouping[0] || "none"}
                            onValueChange={(val) => onGroupingChange(val === "none" ? [] : [val])}
                        >
                            <SelectTrigger className="h-9 rounded-xl glass-panel border-border/50">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="تجميع حسب..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50">
                                <SelectItem value="none" className="rounded-lg">بدون تجميع</SelectItem>
                                {groupingOptions.map((opt) => (
                                    <SelectItem key={opt.id} value={opt.id} className="rounded-lg">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2">
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={onClearColumnFilters}
                        title="مسح جميع فلاتر الأعمدة"
                        className="group h-8 flex items-center gap-1.5 px-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200 active:scale-95 animate-in slide-in-from-right-2 duration-300"
                    >
                        <FilterX className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium hidden sm:inline">مسح الفلاتر</span>
                        <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                            {activeFilterCount}
                        </span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    title="تحديث البيانات"
                    className="group relative h-8 w-8 flex items-center justify-center rounded-xl border border-border/50 bg-background hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCcw className={cn(
                        "h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors",
                        isRefreshing && "animate-spin"
                    )} />
                </button>
                <div className="text-[11px] text-muted-foreground font-medium bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40 whitespace-nowrap">
                    الإجمالي: <span className="text-foreground font-bold">{(totalCount ?? dataLength).toLocaleString("ar-EG")}</span>
                </div>
            </div>
        </div>
    )
}
