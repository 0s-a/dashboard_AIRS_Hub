"use client"

import { DataTable } from "@/components/ui/data-table"
import { userColumns, type UserRow } from "./user-columns"

interface UserTableProps {
    data: UserRow[]
}

export function UserTable({ data }: UserTableProps) {
    return (
        <DataTable
            columns={userColumns}
            data={data}
            searchPlaceholder="بحث بالاسم أو اسم المستخدم..."
        />
    )
}
