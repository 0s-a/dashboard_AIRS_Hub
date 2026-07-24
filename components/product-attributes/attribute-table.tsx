"use client"

import { useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { createColumns } from "./columns"
import type { SerializedItemAttributeCatalog } from "@/lib/types/item-attribute"

interface AttributeTableProps {
    data: SerializedItemAttributeCatalog[]
    onEdit: (attr: SerializedItemAttributeCatalog) => void
    onRefresh?: () => void | Promise<void>
}

export function AttributeTable({ data, onEdit, onRefresh }: AttributeTableProps) {
    const columns = useMemo(() => createColumns({ onEdit }), [onEdit])
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} searchPlaceholder="ابحث عن صفة..." />
}
