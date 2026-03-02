"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { PriceLabel } from "@prisma/client"

interface PriceLabelTableProps {
    data: PriceLabel[]
}

export function PriceLabelTable({ data }: PriceLabelTableProps) {
    return <DataTable columns={columns} data={data} />
}
