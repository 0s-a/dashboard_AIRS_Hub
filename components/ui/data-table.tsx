"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    SortingState,
    GroupingState,
    ExpandedState,
} from "@tanstack/react-table"
import { Search, X, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast, Layers, LayoutGrid, RefreshCcw, SlidersHorizontal, FilterX, Calendar, Hash, Check, XCircle, ListFilter } from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ColumnFilterMeta, FilterOption } from "@/components/ui/column-filter-types"

interface GroupingOption {
    id: string
    label: string
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchPlaceholder?: string
    showSearch?: boolean
    showPagination?: boolean
    showColumnFilters?: boolean
    totalCount?: number
    groupingOptions?: GroupingOption[]
    renderSubComponent?: (props: { row: any }) => React.ReactElement
    globalFilterFn?: (row: any, columnId: string, filterValue: string) => boolean
    onRefresh?: () => void | Promise<void>
    footerContent?: React.ReactNode
}

// Pre-compute row model factories outside the component to avoid
// re-creating them on every render (which triggers state updates
// before mount and causes the React warning).
const coreRowModel = getCoreRowModel()
const filteredRowModel = getFilteredRowModel()
const paginationRowModel = getPaginationRowModel()
const sortedRowModel = getSortedRowModel()
const groupedRowModel = getGroupedRowModel()
const expandedRowModel = getExpandedRowModel()

// ─── Shared filter input styles ──────────────────────────────
const filterInputBase = cn(
    "w-full h-10 text-sm rounded-lg",
    "bg-background/60 backdrop-blur-sm",
    "border border-border/30",
    "placeholder:text-muted-foreground/40",
    "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40",
    "transition-all duration-200",
)

// ─── 1. Text Filter ──────────────────────────────────────────
function TextFilter({ column, placeholder }: { column: any; placeholder?: string }) {
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
                    onClick={() => column.setFilterValue(undefined)}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}

// ─── 2. Boolean Filter (pill toggle) ─────────────────────────
function BooleanFilter({ column }: { column: any }) {
    const filterValue = column.getFilterValue() as string | undefined

    const options = [
        { value: undefined, label: "الكل", icon: null },
        { value: "true", label: "نشط", icon: Check },
        { value: "false", label: "غير نشط", icon: XCircle },
    ]

    return (
        <div className="flex items-center gap-1 h-10">
            {options.map((opt) => {
                const isActive = filterValue === opt.value
                const Icon = opt.icon
                return (
                    <button
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

// ─── 3. Select Filter (dropdown) ─────────────────────────────
function SelectFilterInput({ column, options }: { column: any; options: FilterOption[] }) {
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
                    onClick={() => column.setFilterValue(undefined)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}

// ─── 4. Date Range Filter ────────────────────────────────────
function DateRangeFilter({ column }: { column: any }) {
    const filterValue = (column.getFilterValue() ?? { from: "", to: "" }) as { from: string; to: string }

    const updateFilter = (key: "from" | "to", value: string) => {
        const next = { ...filterValue, [key]: value }
        if (!next.from && !next.to) {
            column.setFilterValue(undefined)
        } else {
            column.setFilterValue(next)
        }
    }

    const hasValue = filterValue.from || filterValue.to

    return (
        <div className="flex items-center gap-0.5 h-7">
            <div className="relative flex-1 group/filter">
                <Calendar className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
                <input
                    type="date"
                    value={filterValue.from}
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
                    value={filterValue.to}
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
                    onClick={() => column.setFilterValue(undefined)}
                    className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}

// ─── 5. Number Range Filter ──────────────────────────────────
function NumberRangeFilter({ column }: { column: any }) {
    const filterValue = (column.getFilterValue() ?? { min: "", max: "" }) as { min: string; max: string }

    const updateFilter = (key: "min" | "max", value: string) => {
        const next = { ...filterValue, [key]: value }
        if (!next.min && !next.max) {
            column.setFilterValue(undefined)
        } else {
            column.setFilterValue(next)
        }
    }

    const hasValue = filterValue.min || filterValue.max

    return (
        <div className="flex items-center gap-0.5 h-7">
            <div className="relative flex-1 group/filter">
                <Hash className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
                <input
                    type="number"
                    value={filterValue.min}
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
                    value={filterValue.max}
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
                    onClick={() => column.setFilterValue(undefined)}
                    className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    )
}

// ─── Smart Column Filter (dispatcher) ────────────────────────
function ColumnFilterInput({ column }: { column: any }) {
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

export function DataTable<TData, TValue>({
    columns,
    data,
    searchPlaceholder = "ابحث...",
    showSearch = true,
    showPagination = true,
    showColumnFilters: initialShowColumnFilters = true,
    totalCount,
    groupingOptions = [],
    renderSubComponent,
    globalFilterFn,
    onRefresh,
    footerContent,
}: DataTableProps<TData, TValue>) {
    const [isMounted, setIsMounted] = React.useState(false)
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [grouping, setGrouping] = React.useState<GroupingState>([])
    const [expanded, setExpanded] = React.useState<ExpandedState>({})
    const [isRefreshing, setIsRefreshing] = React.useState(false)
    const [showFilters, setShowFilters] = React.useState(initialShowColumnFilters)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleRefresh = React.useCallback(async () => {
        if (isRefreshing) return
        setIsRefreshing(true)
        try {
            if (onRefresh) {
                await onRefresh()
            } else {
                router.refresh()
            }
        } finally {
            // Small delay so the animation feels smooth
            setTimeout(() => setIsRefreshing(false), 600)
        }
    }, [onRefresh, isRefreshing, router])

    React.useEffect(() => { setIsMounted(true) }, [])

    // Keyboard shortcut for focusing search (/)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Count active column filters
    const activeFilterCount = columnFilters.length

    // Clear all column filters
    const clearAllColumnFilters = React.useCallback(() => {
        setColumnFilters([])
    }, [])

    // useReactTable must be called unconditionally (Rules of Hooks)
    const table = useReactTable({
        data,
        columns,
        columnResizeMode: "onChange",
        defaultColumn: { size: 150, minSize: 60, maxSize: 500 },
        state: {
            globalFilter,
            columnFilters,
            sorting,
            grouping,
            expanded,
        },
        meta: {
            onRefresh: handleRefresh,
        },
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        onGroupingChange: setGrouping,
        onExpandedChange: setExpanded,
        manualPagination: !showPagination,
        getCoreRowModel: coreRowModel,
        getFilteredRowModel: filteredRowModel,
        getPaginationRowModel: paginationRowModel,
        getSortedRowModel: sortedRowModel,
        getGroupedRowModel: groupedRowModel,
        getExpandedRowModel: expandedRowModel,
        getRowCanExpand: () => true,
        ...(globalFilterFn && { globalFilterFn }),
    })

    // Skeleton shown during hydration — after ALL hooks to respect Rules of Hooks
    if (!isMounted) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="h-11 flex-1 max-w-md rounded-xl bg-muted/40" />
                </div>
                <div className="card-premium overflow-hidden">
                    <div className="h-10 bg-muted/30" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 border-t border-border/40 bg-muted/10" />
                    ))}
                </div>
                <div className="h-10 rounded-lg bg-muted/20" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header / Toolbar Area */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-4">
                    {/* Search Bar UI */}
                    {showSearch && (
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                ref={searchInputRef}
                                placeholder={searchPlaceholder}
                                value={globalFilter ?? ""}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pr-10 pl-12 h-9 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            />
                            {globalFilter && (
                                <button
                                    onClick={() => setGlobalFilter("")}
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

                    {/* Grouping Selector */}
                    {groupingOptions.length > 0 && (
                        <div className="flex items-center gap-2 min-w-[180px]">
                            <Select
                                value={grouping[0] || "none"}
                                onValueChange={(val) => setGrouping(val === "none" ? [] : [val])}
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
                    {/* Column Filters Toggle */}
                    {initialShowColumnFilters && (
                        <button
                            onClick={() => setShowFilters(prev => !prev)}
                            title={showFilters ? "إخفاء فلاتر الأعمدة" : "إظهار فلاتر الأعمدة"}
                            className={cn(
                                "group relative h-8 flex items-center gap-1.5 px-2.5 rounded-xl border transition-all duration-200 active:scale-95",
                                showFilters
                                    ? "border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/10"
                                    : "border-border/50 bg-background hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm text-muted-foreground hover:text-primary"
                            )}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5 transition-colors" />
                            <span className="text-[11px] font-medium hidden sm:inline">فلاتر الأعمدة</span>
                            {activeFilterCount > 0 && (
                                <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold animate-in zoom-in-50 duration-200">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Clear All Column Filters */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllColumnFilters}
                            title="مسح جميع فلاتر الأعمدة"
                            className="group h-8 flex items-center gap-1.5 px-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200 active:scale-95 animate-in slide-in-from-right-2 duration-300"
                        >
                            <FilterX className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium hidden sm:inline">مسح الفلاتر</span>
                        </button>
                    )}

                    <button
                        onClick={handleRefresh}
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
                        الإجمالي: <span className="text-foreground font-bold">{(totalCount ?? data.length).toLocaleString('ar-EG')}</span>
                    </div>
                </div>
            </div>

            <div className="card-premium overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <React.Fragment key={headerGroup.id}>
                                {/* Row 1: Column Headers */}
                                <TableRow className="hover:bg-transparent border-b border-border/50">
                                    {headerGroup.headers.map((header) => {
                                        const isSortable = header.column.getCanSort()

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={cn(
                                                    "h-12 px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground text-start border-l border-border/30 last:border-l-0",
                                                    isSortable && "cursor-pointer select-none hover:text-foreground transition-colors"
                                                )}
                                                style={{
                                                    width: header.getSize(),
                                                    minWidth: header.column.columnDef.minSize,
                                                    maxWidth: header.column.columnDef.maxSize,
                                                }}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 truncate">
                                                        {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </div>
                                                    {isSortable && (
                                                        <span className="shrink-0">
                                                            {{
                                                                asc: <ChevronUp className="h-3.5 w-3.5 text-primary" />,
                                                                desc: <ChevronDown className="h-3.5 w-3.5 text-primary" />,
                                                            }[header.column.getIsSorted() as string] ?? (
                                                                    <ArrowUpDown className="h-3.5 w-3.5 opacity-20 group-hover:opacity-50 transition-opacity" />
                                                                )}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>

                                {/* Row 2: Column Filters */}
                                {showFilters && initialShowColumnFilters && (
                                    <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/10 animate-in slide-in-from-top-1 fade-in duration-200">
                                        {headerGroup.headers.map((header) => {
                                            const canFilter = header.column.getCanFilter()

                                            return (
                                                <TableHead
                                                    key={`filter-${header.id}`}
                                                    className="h-12 px-3 py-2"
                                                    style={{
                                                        width: header.getSize(),
                                                        minWidth: header.column.columnDef.minSize,
                                                        maxWidth: header.column.columnDef.maxSize,
                                                    }}
                                                >
                                                    {canFilter && !header.isPlaceholder ? (
                                                        <ColumnFilterInput column={header.column} />
                                                    ) : (
                                                        <div className="h-7" />
                                                    )}
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => {
                                const isGrouped = row.getIsGrouped()

                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            data-state={row.getIsSelected() && "selected"}
                                            className={cn(
                                                "group hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0",
                                                isGrouped && "bg-muted/20 font-semibold",
                                                row.getIsExpanded() && "bg-muted/10 border-b-0"
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => {
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        className={cn(
                                                            "px-4 py-3 border-l border-border/20 last:border-l-0",
                                                            isGrouped && "py-2"
                                                        )}
                                                        style={{
                                                            width: cell.column.getSize(),
                                                            minWidth: cell.column.columnDef.minSize,
                                                            maxWidth: cell.column.columnDef.maxSize,
                                                        }}
                                                    >
                                                        {cell.getIsGrouped() ? (
                                                            <div
                                                                onClick={row.getToggleExpandedHandler()}
                                                                className="flex items-center gap-2 cursor-pointer w-full justify-start text-primary"
                                                                role="button"
                                                                tabIndex={0}
                                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.getToggleExpandedHandler()() } }}
                                                                style={{ paddingRight: `${row.depth * 2}rem` }}
                                                            >
                                                                {row.getIsExpanded() ? (
                                                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform rtl:rotate-180" />
                                                                )}
                                                                <LayoutGrid className="h-3.5 w-3.5 opacity-50" />
                                                                <span className="truncate flex-1">
                                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    <span className="ms-2 text-xs font-normal text-muted-foreground opacity-70">
                                                                        ({row.subRows.length})
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        ) : cell.getIsAggregated() ? (
                                                            flexRender(
                                                                cell.column.columnDef.aggregatedCell ??
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )
                                                        ) : !cell.getIsPlaceholder() ? (
                                                            flexRender(cell.column.columnDef.cell, cell.getContext())
                                                        ) : null}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                        {row.getIsExpanded() && renderSubComponent && (
                                            <TableRow className="hover:bg-transparent bg-muted/5 border-b border-border/40">
                                                <TableCell colSpan={row.getVisibleCells().length} className="p-3">
                                                    {renderSubComponent({ row })}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-[400px] text-center"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
                                        <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                                            <Search className="h-8 w-8 text-muted-foreground/40" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground">لا توجد نتائج مطابقة</h3>
                                        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                                            لم نتمكن من العثور على ما تبحث عنه. جرب كلمات بحث أخرى أو امسح البحث الحالي.
                                        </p>
                                        {(globalFilter || activeFilterCount > 0) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setGlobalFilter("")
                                                    clearAllColumnFilters()
                                                }}
                                                className="mt-2 rounded-xl border-dashed hover:border-primary hover:text-primary transition-all"
                                            >
                                                <X className="mr-2 h-3 w-3" />
                                                مسح البحث والفلاتر
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
                {footerContent && (
                    <div className="border-t border-border/50 bg-muted/5">
                        {footerContent}
                    </div>
                )}
            </div>

            {/* Pagination UI */}
            {showPagination && (
            <div className="flex items-center justify-between px-2 py-4 border-t border-border/40">
                <div className="flex-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">الصفوف لكل صفحة</span>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] rounded-lg border-border/50">
                                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top" className="rounded-xl border-border/50">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`} className="rounded-lg">
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <span className="hidden sm:inline-block">
                            إجمالي العناصر: <span className="font-bold text-foreground">{(totalCount ?? data.length).toLocaleString('ar-EG')}</span>
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 text-sm">
                    <div className="flex items-center justify-center font-medium min-w-[100px]">
                        الصفحة {table.getState().pagination.pageIndex + 1} من{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-border/50"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            <ChevronFirst className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-border/50"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-border/50"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-border/50"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            <ChevronLast className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            )}
        </div>
    )
}
