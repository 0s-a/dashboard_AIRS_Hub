"use client"

import * as React from "react"
import {
    flexRender,
    type ColumnDef,
    type Row,
    type Table as TanstackTable,
} from "@tanstack/react-table"
import {
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    LayoutGrid,
    Search,
    X,
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ColumnFilterInput } from "./filters/column-filter-input"
import { getBodyCellClass, getCellDir, getColumnMeta, getHeaderCellClass } from "./column-styles"
import { getStickyActionsClass } from "./sticky-utils"

interface DataTableBodyProps<TData, TValue> {
    table: TanstackTable<TData>
    columns: ColumnDef<TData, TValue>[]
    globalFilter: string
    activeFilterCount: number
    onClearSearchAndFilters: () => void
    renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement
    getRowClassName?: (row: TData) => string | undefined
    footerContent?: React.ReactNode
    isLoading?: boolean
}

export function DataTableBody<TData, TValue>({
    table,
    columns,
    globalFilter,
    activeFilterCount,
    onClearSearchAndFilters,
    renderSubComponent,
    getRowClassName,
    footerContent,
    isLoading,
}: DataTableBodyProps<TData, TValue>) {
    return (
        <div
            className={cn(
                "card-premium overflow-hidden flex flex-col max-h-[calc(100vh-120px)] transition-opacity duration-200",
                isLoading && "opacity-60 pointer-events-none"
            )}
        >
            <div className="overflow-auto custom-scrollbar flex-1">
                <Table withScrollContainer={false}>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <React.Fragment key={headerGroup.id}>
                                <TableRow className="hover:bg-transparent border-b border-border/50">
                                    {headerGroup.headers.map((header) => {
                                        const isSortable = header.column.getCanSort()
                                        const meta = getColumnMeta(header.column)
                                        const stickyClass = getStickyActionsClass(header.column, "header")

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={cn(
                                                    "h-12 px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground border-l border-border/30 last:border-l-0",
                                                    getHeaderCellClass(header.column),
                                                    isSortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                                                    stickyClass,
                                                )}
                                                style={{
                                                    width: header.getSize(),
                                                    minWidth: header.column.columnDef.minSize,
                                                    maxWidth: header.column.columnDef.maxSize,
                                                }}
                                                dir={getCellDir(meta)}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <div className={cn(
                                                    "flex items-center gap-2",
                                                    meta?.align === "end" || meta?.cellVariant === "actions"
                                                        ? "justify-end"
                                                        : meta?.align === "center"
                                                            ? "justify-center"
                                                            : "justify-between",
                                                )}>
                                                    <div className="flex-1 truncate min-w-0">
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

                                <TableRow className="hover:bg-transparent border-b border-border/30 bg-muted/10">
                                    {headerGroup.headers.map((header) => {
                                        const canFilter = header.column.getCanFilter()
                                        const stickyClass = getStickyActionsClass(header.column, "header")

                                        return (
                                            <TableHead
                                                key={`filter-${header.id}`}
                                                className={cn("h-12 px-3 py-2", stickyClass)}
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
                                                row.getIsExpanded() && "bg-muted/10 border-b-0",
                                                getRowClassName?.(row.original)
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => {
                                                const meta = getColumnMeta(cell.column)
                                                const stickyClass = getStickyActionsClass(cell.column, "body")

                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        className={cn(
                                                            "px-4 py-3 border-l border-border/20 last:border-l-0",
                                                            getBodyCellClass(cell.column),
                                                            isGrouped && "py-2",
                                                            stickyClass,
                                                            // Match row hover background on sticky cells
                                                            stickyClass && "group-hover:bg-muted/40",
                                                        )}
                                                        style={{
                                                            width: cell.column.getSize(),
                                                            minWidth: cell.column.columnDef.minSize,
                                                            maxWidth: cell.column.columnDef.maxSize,
                                                        }}
                                                        dir={getCellDir(meta)}
                                                    >
                                                        {cell.getIsGrouped() ? (
                                                            <div
                                                                onClick={row.getToggleExpandedHandler()}
                                                                className="flex items-center gap-2 cursor-pointer w-full justify-start text-primary"
                                                                role="button"
                                                                tabIndex={0}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" || e.key === " ") {
                                                                        e.preventDefault()
                                                                        row.getToggleExpandedHandler()()
                                                                    }
                                                                }}
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
                                                            <div className={cn(meta?.cellVariant === "text" && "truncate min-w-0")}>
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </div>
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
                                                onClick={onClearSearchAndFilters}
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
    )
}
