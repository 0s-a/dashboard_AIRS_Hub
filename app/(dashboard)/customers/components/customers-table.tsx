"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, type CustomerRow } from "@/components/customers/columns"

interface CustomersTableProps {
    data: CustomerRow[]
}

export function CustomersTable({ data }: CustomersTableProps) {
    return (
        <DataTable
            columns={columns}
            data={data}
            searchPlaceholder="ابحث عن اسم العميل، رقم الهاتف أو البريد..."
            getRowClassName={(row) =>
                row.isActive === false
                    ? "bg-red-50/60 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-80"
                    : undefined
            }
        />
    )
}
