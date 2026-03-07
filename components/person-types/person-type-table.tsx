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
}

export function PersonTypeTable({ data }: PersonTypeTableProps) {
    return <DataTable columns={columns} data={data} />
}
