"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Group } from "@prisma/client"

type GroupWithCount = Group & {
    _count?: {
        persons: number
    }
}

interface GroupTableProps {
    data: GroupWithCount[]
}

export function GroupTable({ data }: GroupTableProps) {
    return (
        <DataTable
            columns={columns}
            data={data}
            searchPlaceholder="ابحث برقم المجموعة أو الاسم..."
        />
    )
}
