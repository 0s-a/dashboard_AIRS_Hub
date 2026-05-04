"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import type { SerializedCurrency } from "@/app/(dashboard)/currencies/page"

export function CurrencyTable({ data, onRefresh }: { data: SerializedCurrency[]; onRefresh?: () => void | Promise<void> }) {
    return <DataTable columns={columns} data={data} searchPlaceholder="ابحث عن عملة..." onRefresh={onRefresh} />
}
