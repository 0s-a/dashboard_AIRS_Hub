"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Customer } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Trash2, Edit } from "lucide-react"
import { softDeleteCustomer } from "@/lib/actions/crm"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CustomerSheet } from "@/components/crm/customer-sheet"

export const columns: ColumnDef<Customer>[] = [
    {
        accessorKey: "phoneNumber",
        header: "رقم الهاتف", // Phone
        cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("phoneNumber")}</div>
    },
    {
        accessorKey: "name",
        header: "اسم العميل", // Name
        cell: ({ row }) => {
            const name = row.getValue("name") as string
            const initials = name ? name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "??"
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{name}</div>
                </div>
            )
        }
    },
    {
        accessorKey: "totalOrders",
        header: "عدد الطلبات", // Orders
        cell: ({ row }) => (
            <div className="text-center font-medium">
                {row.getValue("totalOrders")}
            </div>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const customer = row.original
            return (
                <div className="flex items-center gap-2">
                    <CustomerSheet
                        key={`edit-${customer.id}`}
                        customer={customer}
                        trigger={
                            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
                                <Edit className="h-4 w-4" />
                            </Button>
                        }
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                            toast.promise(softDeleteCustomer(customer.phoneNumber), {
                                loading: 'جاري الحذف...',
                                success: 'تم حذف العميل',
                                error: 'فشل الحذف'
                            })
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    },
]
