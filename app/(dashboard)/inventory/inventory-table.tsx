"use client"

import { useMemo, useState, useEffect } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, customGlobalFilterFn } from "./columns"
import { VariantsList } from "@/components/inventory/variants-list"

interface InventoryTableProps {
    products: any[]
}

export function InventoryTable({ products }: InventoryTableProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const tableData = useMemo(() => {
        return products.map(p => ({ ...p }))
    }, [products])

    if (!isMounted) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                جاري تحميل الجدول...
            </div>
        )
    }

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
                const primaryPrice = product.productPrices?.[0]?.value || null
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
