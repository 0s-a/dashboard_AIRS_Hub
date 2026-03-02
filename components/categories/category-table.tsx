"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Category } from "@prisma/client"



interface CategoryTableProps {
    data: Category[]
}

export function CategoryTable({ data }: CategoryTableProps) {
    return <DataTable columns={columns} data={data} />
}
