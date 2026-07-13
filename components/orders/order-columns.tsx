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
import { MoreHorizontal, Pencil, Trash2, Package, CheckCircle2, Clock, XCircle, Truck, ShoppingBag, ExternalLink, Printer } from "lucide-react"
import { deleteOrder, updateOrderStatus } from "@/lib/actions/orders"
import { toast } from "sonner"
import { OrderSheet } from "./order-sheet"
import Link from "next/link"
import { calcOrderTotal } from "@/lib/order-utils"
import { ORDER_STATUS_CONFIG, ORDER_STATUS_LIST, type OrderStatusValue } from "@/lib/order-constants"

// ─── Status Config ────────────────────────────────────────────────────────────
// استخدام ORDER_STATUS_LIST من constants — مصدر موحّد
// نُضيف icon هنا لأن constants لا تستورد React components

const STATUS_ICONS: Record<OrderStatusValue, React.ComponentType<{ className?: string }>> = {
    pending:    Clock,
    confirmed:  CheckCircle2,
    processing: Package,
    shipped:    Truck,
    delivered:  ShoppingBag,
    cancelled:  XCircle,
}

/** للتوافق مع order-sheet.tsx الذي يستورد ORDER_STATUSES من هنا */
export const ORDER_STATUSES = ORDER_STATUS_LIST.map(s => ({
    ...s,
    icon: STATUS_ICONS[s.value],
}))

export function StatusBadge({ status }: { status: string }) {
    const cfg = ORDER_STATUS_CONFIG[status as OrderStatusValue]
        ?? { label: status, color: 'bg-muted text-muted-foreground border-border' }
    const Icon = STATUS_ICONS[status as OrderStatusValue] ?? Package
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
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                        <Link href={`/orders/${order.id}`} className="flex items-center cursor-pointer">
                            <ExternalLink className="size-4 ml-2 text-violet-500" />
                            عرض تفاصيل الطلب
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/invoice/${order.id}`} target="_blank" className="flex items-center cursor-pointer">
                            <Printer className="size-4 ml-2 text-blue-500" />
                            طباعة الفاتورة
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {ORDER_STATUSES.filter(s => s.value !== order.status).map(s => (
                        <DropdownMenuItem key={s.value} onClick={() => handleStatus(s.value)}>
                            <s.icon className="size-4 ml-2" />
                            {s.label}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="size-4 ml-2" />
                        حذف الطلب
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export function getOrderColumns(customers: any[], products: any[], defaultSymbol = ""): ColumnDef<any>[] {
    return [
        {
            accessorKey: "orderNumber",
            header: "رقم الطلب",
            size: 120,
            minSize: 100,
            maxSize: 140,
            meta: { cellVariant: "code" as const, align: "start" as const },
            cell: ({ row }) => (
                <Link
                    href={`/orders/${row.original.id}`}
                    className="font-bold text-primary text-sm hover:underline underline-offset-2 transition-colors truncate"
                    onClick={(e) => e.stopPropagation()}
                >
                    #{row.original.orderNumber}
                </Link>
            ),
        },
        {
            accessorKey: "customer",
            header: "العميل",
            size: 170,
            minSize: 130,
            maxSize: 220,
            meta: { cellVariant: "text" as const, align: "start" as const },
            cell: ({ row }) => {
                const customer = row.original.customer
                if (!customer) return <span className="text-muted-foreground text-sm">—</span>
                return (
                    <Link
                        href={`/customers/${customer.id}`}
                        className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 transition-colors truncate block"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {customer.name}
                    </Link>
                )
            },
        },
        {
            accessorKey: "items",
            header: "المنتجات",
            size: 260,
            minSize: 200,
            maxSize: 340,
            enableSorting: false,
            meta: { cellVariant: "text" as const, align: "start" as const },
            cell: ({ row }) => {
                const items = row.original.items ?? []
                if (items.length === 0) return <span className="text-muted-foreground text-sm">—</span>
                const visibleItems = items.slice(0, 2)
                const extraCount = items.length - visibleItems.length
                return (
                    <div className="flex flex-col gap-0.5 py-0.5 min-w-0">
                        {visibleItems.map((item: any, i: number) => {
                            const attrText = (item.product?.productAttributes ?? [])
                                .map((a: { value?: string }) => a.value)
                                .filter(Boolean)
                                .join(' / ')
                            return (
                            <div key={i} className="flex items-center gap-1.5 text-xs min-w-0">
                                <span className="text-foreground/80 truncate min-w-0">
                                    {item.product?.name ?? '—'}
                                    {attrText && (
                                        <span className="text-muted-foreground/60">
                                            {' '}({attrText})
                                        </span>
                                    )}
                                </span>
                                <span className="text-foreground font-semibold shrink-0 mr-auto">
                                    ×{item.quantity}
                                    {item.unit?.name && (
                                        <span className="text-muted-foreground font-normal text-[9px] mr-0.5">
                                            {item.unit.name}
                                        </span>
                                    )}
                                </span>
                            </div>
                            )
                        })}
                        {extraCount > 0 && (
                            <span className="text-primary font-semibold text-[10px]">+{extraCount} منتجات أخرى</span>
                        )}
                    </div>
                )
            },
        },
        {
            id: "totalAmount",
            header: "الإجمالي",
            size: 130,
            minSize: 100,
            maxSize: 160,
            meta: { cellVariant: "number" as const, align: "end" as const },
            cell: ({ row }) => {
                const order = row.original
                const total = calcOrderTotal(
                    order.items ?? [],
                    order.customer?.priceLabelId
                )
                return (
                    <span className="font-semibold text-sm">
                        {total.toLocaleString("ar-YE")} {defaultSymbol}
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
                align: "start" as const,
            },
            filterFn: "select",
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
            meta: { align: "start" as const },
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
            enableSorting: false,
            meta: { cellVariant: "actions" as const, sticky: "actions" as const, align: "end" as const },
            header: "الإجراءات",
            size: 100,
            cell: ({ row }) => (
                <ActionsCell row={row} customers={customers} products={products} />
            ),
        },
    ]
}
