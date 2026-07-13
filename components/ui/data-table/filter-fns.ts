import type { Column, FilterFn, Row } from "@tanstack/react-table"

export type DateRangeFilterValue = { from?: string; to?: string }
export type NumberRangeFilterValue = { min?: string; max?: string }

function toDate(value: unknown): Date | null {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    const d = new Date(value as string | number)
    return Number.isNaN(d.getTime()) ? null : d
}

function toNumber(value: unknown): number | null {
    if (value == null || value === "") return null
    const n = typeof value === "number" ? value : Number(value)
    return Number.isFinite(n) ? n : null
}

export const dateRangeFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
    const range = filterValue as DateRangeFilterValue | undefined
    if (!range?.from && !range?.to) return true
    const cellDate = toDate(row.getValue(columnId))
    if (!cellDate) return false
    if (range.from) {
        const from = new Date(range.from)
        from.setHours(0, 0, 0, 0)
        if (cellDate < from) return false
    }
    if (range.to) {
        const to = new Date(range.to)
        to.setHours(23, 59, 59, 999)
        if (cellDate > to) return false
    }
    return true
}

export const numberRangeFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
    const range = filterValue as NumberRangeFilterValue | undefined
    if (!range?.min && !range?.max) return true
    const n = toNumber(row.getValue(columnId))
    if (n == null) return false
    if (range.min !== undefined && range.min !== "" && n < Number(range.min)) return false
    if (range.max !== undefined && range.max !== "" && n > Number(range.max)) return false
    return true
}

export const booleanFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
    if (filterValue == null || filterValue === "") return true
    return String(row.getValue(columnId)) === String(filterValue)
}

export const selectFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
    if (filterValue == null || filterValue === "") return true
    return String(row.getValue(columnId)) === String(filterValue)
}

/** Named filterFns registered on useReactTable */
export const dataTableFilterFns = {
    dateRange: dateRangeFilterFn,
    numberRange: numberRangeFilterFn,
    boolean: booleanFilterFn,
    select: selectFilterFn,
}

export type DataTableFilterFnId = keyof typeof dataTableFilterFns

/** Resolve filter value helper for typed columns */
export function getColumnFilterValue<TData>(column: Column<TData, unknown>): unknown {
    return column.getFilterValue()
}

export function rowMatchesBoolean(row: Row<unknown>, columnId: string, filterValue: string) {
    return String(row.getValue(columnId)) === filterValue
}
