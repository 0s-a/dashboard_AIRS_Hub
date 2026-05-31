"use client"

import { DataTable } from "@/components/ui/data-table"
import { supervisorColumns } from "./supervisor-columns"
import type { SupervisorRow } from "./supervisor-columns"

interface SupervisorTableProps {
    data: SupervisorRow[]
    onEdit: (s: SupervisorRow) => void
    onRefresh: (updated: SupervisorRow[]) => void
}

export function SupervisorTable({ data, onEdit, onRefresh }: SupervisorTableProps) {
    const columns = supervisorColumns({ onEdit, onRefresh })
    return (
        <DataTable
            columns={columns}
            data={data}
            searchPlaceholder="ابحث عن اسم المشرف، رقم هاتف أو واتساب..."
        />
    )
}
