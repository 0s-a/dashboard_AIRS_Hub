"use client"

import { useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { createColumns } from "./columns"
import type { SerializedProductAttributeCatalog } from "@/lib/types/product-attribute"

interface AttributeTableProps {
    data: SerializedProductAttributeCatalog[]
    onEdit: (attr: SerializedProductAttributeCatalog) => void
    onRefresh?: () => void | Promise<void>
}

export function AttributeTable({ data, onEdit, onRefresh }: AttributeTableProps) {
    const columns = useMemo(() => createColumns({ onEdit }), [onEdit])
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} searchPlaceholder="ابحث عن صفة..." />
}
