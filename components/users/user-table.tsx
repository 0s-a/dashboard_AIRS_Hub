"use client"

import { DataTable } from "@/components/ui/data-table"
import { userColumns, type UserRow } from "./user-columns"

interface UserTableProps {
    data: UserRow[]
    onRefresh?: () => void | Promise<void>
}

export function UserTable({ data, onRefresh }: UserTableProps) {
    return (
        <DataTable
            columns={userColumns}
            data={data}
            searchPlaceholder="بحث بالاسم أو اسم المستخدم..."
            onRefresh={onRefresh}
        />
    )
}
