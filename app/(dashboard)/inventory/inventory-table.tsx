"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { VariantsList } from "@/components/inventory/variants-list"

interface InventoryTableProps {
    products: any[]
}

export function InventoryTable({ products }: InventoryTableProps) {
    return (
        <DataTable
            columns={columns}
            data={products}
            searchPlaceholder="ابحث عن منتج، فئة، أو رقم صنف..."
            groupingOptions={[
                { id: "category", label: "التصنيف" },
                { id: "tier", label: "المستوى" },
                { id: "unit", label: "الوحدة" },
                { id: "isAvailable", label: "نفاذ الكمية" },
            ]}
            renderSubComponent={({ row }) => (
                <VariantsList
                    variants={(row.original as any).variants}
                    basePrice={Number(row.original.price)}
                />
            )}
        />
    )
}
