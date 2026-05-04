"use client"

import { DataTable } from "@/components/ui/data-table"
import { userColumns } from "./user-columns"
import type { UserRow } from "./user-columns"

interface UserTableProps {
    data: UserRow[]
    onEdit: (user: UserRow) => void
    onRefresh: (updated: UserRow[]) => void
}

export function UserTable({ data, onEdit, onRefresh }: UserTableProps) {
    const columns = userColumns({ onEdit, onRefresh })
    return (
        <DataTable
            columns={columns}
            data={data}
            searchPlaceholder="ابحث عن اسم أو اسم مستخدم..."
        />
    )
}
