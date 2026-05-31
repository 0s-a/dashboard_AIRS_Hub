"use client"

import { DataTable } from "@/components/ui/data-table"
import { getOrderColumns } from "@/components/orders/order-columns"

interface Props {
    orders: any[]
    customers: any[]
    products: any[]
    onRefresh?: () => void | Promise<void>
}

export function OrdersTable({ orders, customers, products, onRefresh }: Props) {
    const columns = getOrderColumns(customers, products)

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
