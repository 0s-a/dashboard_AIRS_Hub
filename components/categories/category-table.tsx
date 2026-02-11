"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Category } from "@prisma/client"

type CategoryWithCount = Category & {
    _count: {
        products: number
    }
}

interface CategoryTableProps {
    data: CategoryWithCount[]
}

export function CategoryTable({ data }: CategoryTableProps) {
    return <DataTable columns={columns} data={data} />
}
