"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Color } from "@prisma/client"

interface ColorTableProps {
    data: Color[]
    onRefresh?: () => void | Promise<void>
}

export function ColorTable({ data, onRefresh }: ColorTableProps) {
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} />
}
