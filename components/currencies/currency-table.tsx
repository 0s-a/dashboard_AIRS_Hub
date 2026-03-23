"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Currency } from "@prisma/client"

export function CurrencyTable({ data, onRefresh }: { data: Currency[]; onRefresh?: () => void | Promise<void> }) {
    return <DataTable columns={columns} data={data} searchPlaceholder="ابحث عن عملة..." onRefresh={onRefresh} />
}
