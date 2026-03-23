"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Category } from "@prisma/client"



interface CategoryTableProps {
    data: Category[]
    onRefresh?: () => void | Promise<void>
}

export function CategoryTable({ data, onRefresh }: CategoryTableProps) {
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} />
}
