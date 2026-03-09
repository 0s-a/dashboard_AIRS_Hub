"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Package, CheckCircle2, Clock, XCircle, Truck, ShoppingBag } from "lucide-react"
import { deleteOrder, updateOrderStatus } from "@/lib/actions/orders"
import { toast } from "sonner"
import { OrderSheet } from "./order-sheet"

// ─── Status Config ────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
    { value: "pending",    label: "معلق",       icon: Clock,         color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
    { value: "confirmed",  label: "مؤكد",       icon: CheckCircle2,  color: "bg-blue-500/10 text-blue-600 border-blue-200" },
    { value: "processing", label: "قيد التجهيز", icon: Package,       color: "bg-violet-500/10 text-violet-600 border-violet-200" },
    { value: "shipped",    label: "تم الشحن",    icon: Truck,         color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
    { value: "delivered",  label: "تم التسليم",  icon: ShoppingBag,   color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
    { value: "cancelled",  label: "ملغي",        icon: XCircle,       color: "bg-red-500/10 text-red-600 border-red-200" },
]

function StatusBadge({ status }: { status: string }) {
    const cfg = ORDER_STATUSES.find(s => s.value === status) ?? ORDER_STATUSES[0]
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
            <Icon className="size-3" />
            {cfg.label}
        </span>
    )
}

// ─── Actions Cell ─────────────────────────────────────────────────────────────

function ActionsCell({ row, persons, products }: { row: any, persons: any[], products: any[] }) {
    const order = row.original

    async function handleDelete() {
        if (!confirm(`هل أنت متأكد من حذف الطلب #${order.orderNumber}؟`)) return
        const res = await deleteOrder(order.id)
        if (res.success) toast.success("تم حذف الطلب")
        else toast.error(res.error ?? "تعذّر حذف الطلب")
    }

    async function handleStatus(status: string) {
        const res = await updateOrderStatus(order.id, status)
        if (res.success) toast.success("تم تحديث الحالة")
        else toast.error(res.error ?? "تعذّر تحديث الحالة")
    }

    return (
        <div className="flex items-center justify-end gap-1">
            <OrderSheet
                mode="edit"
                order={order}
                persons={persons}
                products={products}
                trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary">
                        <Pencil className="size-4" />
                    </Button>
                }
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                        <MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {ORDER_STATUSES.filter(s => s.value !== order.status).map(s => (
                        <DropdownMenuItem key={s.value} onClick={() => handleStatus(s.value)}>
                            <s.icon className="size-4 ml-2" />
                            {s.label}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash2 className="size-4 ml-2" />
                        حذف الطلب
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export function getOrderColumns(persons: any[], products: any[]): ColumnDef<any>[] {
    return [
        {
            accessorKey: "orderNumber",
            header: "رقم الطلب",
            cell: ({ row }) => (
                <span className="font-mono font-bold text-primary text-sm">
                    #{row.original.orderNumber}
                </span>
            ),
        },
        {
            accessorKey: "person",
            header: "الشخص",
            cell: ({ row }) => (
                <span className="text-sm font-medium">
                    {row.original.person?.name ?? <span className="text-muted-foreground">—</span>}
                </span>
            ),
        },
        {
            accessorKey: "items",
            header: "المنتجات",
            cell: ({ row }) => {
                const items = row.original.items ?? []
                if (items.length === 0) return <span className="text-muted-foreground text-sm">—</span>
                return (
                    <div className="flex flex-col gap-1 text-xs">
                        {items.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                                {item.variant?.hex && (
                                    <span
                                        className="size-3 rounded-full border border-black/10 shrink-0"
                                        style={{ backgroundColor: item.variant.hex }}
                                    />
                                )}
                                <span className="text-muted-foreground">
                                    {item.product?.name ?? "—"}
                                    {item.variant?.name && (
                                        <span className="text-[10px] text-muted-foreground/60 mr-1">({item.variant.name})</span>
                                    )}
                                </span>
                                <span className="text-foreground font-semibold">×{item.quantity}</span>
                            </div>
                        ))}
                        {items.length > 2 && (
                            <span className="text-primary font-semibold">+{items.length - 2} أخرى</span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "totalAmount",
            header: "الإجمالي",
            cell: ({ row }) => {
                const order = row.original
                const amount = order.totalAmount
                // determine currency from first item
                const firstItem = order.items?.[0]
                const symbol = firstItem?.currency?.symbol ?? ""
                if (amount == null) return <span className="text-muted-foreground">—</span>
                return (
                    <span className="font-mono font-semibold text-sm">
                        {amount.toLocaleString("ar-YE")} {symbol}
                    </span>
                )
            },
        },
        {
            accessorKey: "status",
            header: "الحالة",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            filterFn: (row, _id, filterValue) => {
                if (!filterValue || filterValue === "all") return true
                return row.original.status === filterValue
            },
        },
        {
            accessorKey: "createdAt",
            header: "التاريخ",
            cell: ({ row }) => {
                const d = new Date(row.original.createdAt)
                return (
                    <span className="text-xs text-muted-foreground">
                        {d.toLocaleDateString("ar-YE")}
                    </span>
                )
            },
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <ActionsCell row={row} persons={persons} products={products} />
            ),
        },
    ]
}
