"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { ProductAttribute } from "@prisma/client"

interface AttributeTableProps {
    data: ProductAttribute[]
    onRefresh?: () => void | Promise<void>
}

export function AttributeTable({ data, onRefresh }: AttributeTableProps) {
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} />
}
