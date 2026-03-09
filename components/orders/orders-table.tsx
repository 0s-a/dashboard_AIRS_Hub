"use client"

import { DataTable } from "@/components/ui/data-table"
import { getOrderColumns } from "@/components/orders/order-columns"

interface Props {
    orders: any[]
    persons: any[]
    products: any[]
}

export function OrdersTable({ orders, persons, products }: Props) {
    const columns = getOrderColumns(persons, products)

    return (
        <DataTable
            columns={columns}
            data={orders}
            searchPlaceholder="ابحث برقم الطلب أو اسم الشخص..."
            groupingOptions={[
                { id: "status", label: "الحالة" },
            ]}
        />
    )
}
