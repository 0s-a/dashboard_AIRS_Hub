"use client"

import { useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, customGlobalFilterFn } from "./columns"
import { VariantsList } from "@/components/inventory/variants-list"

interface InventoryTableProps {
    products: any[]
}

export function InventoryTable({ products }: InventoryTableProps) {
    const tableData = useMemo(() => {
        // Clone and ensure variants/colors arrays are safely handled to prevent mutation
        return products.map(p => ({ ...p }))
    }, [products])

    return (
        <DataTable
            columns={columns}
            data={tableData}
            searchPlaceholder="ابحث عن منتج، فئة، أو رقم صنف..."
            groupingOptions={[
                { id: "unit", label: "الوحدة" },
                { id: "isAvailable", label: "نفاذ الكمية" },
            ]}
            renderSubComponent={({ row }) => {
                const product = row.original as any
                const primaryPrice = product.prices?.[0]?.value || null
                const primaryImage = product.mediaImages?.find((img: any) => img.isPrimary)?.url || product.mediaImages?.[0]?.url

                const variantsWithDefaults = (product.variants || []).map((v: any) => ({
                    ...v,
                    price: v.price ?? primaryPrice,
                    images: v.images?.length > 0 ? v.images : (primaryImage ? [{ url: primaryImage }] : []),
                    imageCount: v.imageCount > 0 ? v.imageCount : (primaryImage ? 1 : 0)
                }))

                return (
                    <VariantsList
                        variants={variantsWithDefaults}
                    />
                )
            }}
            globalFilterFn={customGlobalFilterFn}
        />
    )
}
