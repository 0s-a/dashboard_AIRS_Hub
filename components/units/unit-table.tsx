"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, UnitRow } from "./columns"

interface UnitTableProps {
    data: UnitRow[]
    onRefresh?: () => void | Promise<void>
}

export function UnitTable({ data, onRefresh }: UnitTableProps) {
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} />
}
