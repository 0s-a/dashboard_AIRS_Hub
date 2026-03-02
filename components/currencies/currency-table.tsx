"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Currency } from "@prisma/client"

export function CurrencyTable({ data }: { data: Currency[] }) {
    return <DataTable columns={columns} data={data} searchPlaceholder="ابحث عن عملة..." />
}
