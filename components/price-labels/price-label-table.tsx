"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { PriceLabel } from "@prisma/client"

interface PriceLabelTableProps {
    data: PriceLabel[]
    onRefresh?: () => void | Promise<void>
}

export function PriceLabelTable({ data, onRefresh }: PriceLabelTableProps) {
    return <DataTable columns={columns} data={data} onRefresh={onRefresh} />
}
