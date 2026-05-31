"use client"

import { ColumnDef } from "@tanstack/react-table"
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

function ActionsCell({ row, customers, products }: { row: any, customers: any[], products: any[] }) {
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
                customers={customers}
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

export function getOrderColumns(customers: any[], products: any[]): ColumnDef<any>[] {
    return [
        {
            accessorKey: "orderNumber",
            header: "رقم الطلب",
            size: 110,
            minSize: 90,
            maxSize: 130,
            cell: ({ row }) => (
                <span className="font-mono font-bold text-primary text-sm">
                    #{row.original.orderNumber}
                </span>
            ),
        },
        {
            accessorKey: "customer",
            header: "العميل",
            size: 170,
            minSize: 130,
            maxSize: 220,
            cell: ({ row }) => (
                <span className="text-sm font-medium">
                    {row.original.customer?.name ?? <span className="text-muted-foreground">—</span>}
                </span>
            ),
        },
        {
            accessorKey: "items",
            header: "المنتجات",
            size: 260,
            minSize: 200,
            maxSize: 340,
            enableSorting: false,
            cell: ({ row }) => {
                const items = row.original.items ?? []
                if (items.length === 0) return <span className="text-muted-foreground text-sm">—</span>

                const visibleItems = items.slice(0, 2)
                const extraCount = items.length - visibleItems.length

                return (
                    <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs">
                        {visibleItems.map((item: any, i: number) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-muted-foreground/30">·</span>}
                                {item.variant?.hex && (
                                    <span
                                        className="size-2 rounded-full border border-black/10 shrink-0"
                                        style={{ backgroundColor: item.variant.hex }}
                                    />
                                )}
                                <span className="text-foreground/80 truncate max-w-[130px]">
                                    {item.product?.name ?? '—'}
                                    {item.variant?.name && (
                                        <span className="text-muted-foreground/60 text-[10px]"> ({item.variant.name})</span>
                                    )}
                                </span>
                                <span className="text-foreground font-semibold shrink-0">×{item.quantity}</span>
                            </span>
                        ))}
                        {extraCount > 0 && (
                            <span className="text-primary font-semibold text-[10px]">+{extraCount}</span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "totalAmount",
            header: "الإجمالي",
            size: 130,
            minSize: 100,
            maxSize: 160,
            cell: ({ row }) => {
                const order = row.original
                const amount = order.totalAmount
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
            enableColumnFilter: true,
            meta: {
                filterType: 'select' as const,
                filterOptions: ORDER_STATUSES.map(s => ({ label: s.label, value: s.value })),
            },
            filterFn: (row: any, _columnId: string, filterValue: string) => {
                return row.original.status === filterValue
            },
            header: "الحالة",
            size: 140,
            minSize: 120,
            maxSize: 170,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            accessorKey: "createdAt",
            header: "التاريخ",
            size: 120,
            minSize: 100,
            maxSize: 150,
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
            enableColumnFilter: false,
            header: "",
            size: 100,
            cell: ({ row }) => (
                <ActionsCell row={row} customers={customers} products={products} />
            ),
        },
    ]
}
