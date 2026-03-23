"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"

interface PersonType {
    id: string
    name: string
    description: string | null
    color: string | null
    icon: string | null
    notes: string | null
    isDefault: boolean
    createdAt: Date
    updatedAt: Date
}

interface PersonTypeTableProps {
    data: PersonType[]
    onRefresh?: () => void | Promise<void>
}

export function PersonTypeTable({ data, onRefresh }: PersonTypeTableProps) {
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} />
}
