"use client"

import * as React from "react"
import {
    ColumnDef,
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
import { Search, X, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast, Layers, LayoutGrid } from "lucide-react"

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

interface GroupingOption {
    id: string
    label: string
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchPlaceholder?: string
    showSearch?: boolean
    groupingOptions?: GroupingOption[]
    renderSubComponent?: (props: { row: any }) => React.ReactElement
    globalFilterFn?: (row: any, columnId: string, filterValue: string) => boolean
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

export function DataTable<TData, TValue>({
    columns,
    data,
    searchPlaceholder = "ابحث...",
    showSearch = true,
    groupingOptions = [],
    renderSubComponent,
    globalFilterFn,
}: DataTableProps<TData, TValue>) {
    const [isMounted, setIsMounted] = React.useState(false)
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [grouping, setGrouping] = React.useState<GroupingState>([])
    const [expanded, setExpanded] = React.useState<ExpandedState>({})
    const searchInputRef = React.useRef<HTMLInputElement>(null)

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

    // useReactTable must be called unconditionally (Rules of Hooks)
    const table = useReactTable({
        data,
        columns,
        state: {
            globalFilter,
            sorting,
            grouping,
            expanded,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onGroupingChange: setGrouping,
        onExpandedChange: setExpanded,
        getCoreRowModel: coreRowModel,
        getFilteredRowModel: filteredRowModel,
        getPaginationRowModel: paginationRowModel,
        getSortedRowModel: sortedRowModel,
        getGroupedRowModel: groupedRowModel,
        getExpandedRowModel: expandedRowModel,
        getRowCanExpand: () => true,
        globalFilterFn: globalFilterFn,
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
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
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
                                className="pr-10 pl-12 h-11 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
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
                                <SelectTrigger className="h-11 rounded-xl glass-panel border-border/50">
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

                <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40 whitespace-nowrap">
                        العدد الإجمالي: <span className="text-foreground font-bold">{data.length}</span>
                    </div>
                </div>
            </div>

            <div className="card-premium overflow-hidden flex flex-col max-h-[calc(100vh-280px)]">
                <div className="overflow-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/50">
                                {headerGroup.headers.map((header) => {
                                    const isSortable = header.column.getCanSort()

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "h-10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right",
                                                isSortable && "cursor-pointer select-none hover:text-foreground transition-colors"
                                            )}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
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
                                                "group hover:bg-primary/2 transition-colors border-b border-border/40 last:border-0",
                                                isGrouped && "bg-muted/20 font-semibold",
                                                row.getIsExpanded() && "bg-muted/10 border-b-0"
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => {
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        className={cn(
                                                            "px-3 py-2",
                                                            isGrouped && "py-2"
                                                        )}
                                                    >
                                                        {cell.getIsGrouped() ? (
                                                            <button
                                                                onClick={row.getToggleExpandedHandler()}
                                                                className="flex items-center gap-2 cursor-pointer w-full justify-start text-primary"
                                                                style={{ paddingRight: `${row.depth * 2}rem` }}
                                                            >
                                                                {row.getIsExpanded() ? (
                                                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform rtl:rotate-180" />
                                                                )}
                                                                <LayoutGrid className="h-3.5 w-3.5 opacity-50" />
                                                                <span className="truncate">
                                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    <span className="mr-2 text-xs font-normal text-muted-foreground opacity-70">
                                                                        ({row.subRows.length})
                                                                    </span>
                                                                </span>
                                                            </button>
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
                                                <TableCell colSpan={row.getVisibleCells().length} className="p-4">
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
                                        {globalFilter && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setGlobalFilter("")}
                                                className="mt-2 rounded-xl border-dashed hover:border-primary hover:text-primary transition-all"
                                            >
                                                <X className="mr-2 h-3 w-3" />
                                                مسح البحث
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
            </div>

            {/* Pagination UI */}
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
                            إجمالي العناصر: <span className="font-bold text-foreground">{data.length}</span>
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
        </div>
    )
}
