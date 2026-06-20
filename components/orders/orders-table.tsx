"use client"

import { DataTable } from "@/components/ui/data-table"
import { getOrderColumns } from "@/components/orders/order-columns"

interface Props {
    orders: any[]
    customers: any[]
    products: any[]
    defaultSymbol?: string
    onRefresh?: () => void | Promise<void>
}

export function OrdersTable({ orders, customers, products, defaultSymbol = "", onRefresh }: Props) {
    const columns = getOrderColumns(customers, products, defaultSymbol)

    return (
        <DataTable
            columns={columns}
            data={orders}
            searchPlaceholder="ابحث برقم الطلب أو اسم العميل..."
            groupingOptions={[
                { id: "status", label: "الحالة" },
            ]}
            onRefresh={onRefresh}
        />
    )
}
