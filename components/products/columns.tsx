"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import { deleteProduct } from "@/lib/actions/products"
import { ProductSheet } from "./product-sheet"
import type { ProductRow } from "@/lib/types/product"

export type { ProductRow }

interface ActionCellProps {
    product: ProductRow
    onRefresh: () => void
}

function ActionCell({ product, onRefresh }: ActionCellProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    async function handleDelete() {
        setIsDeleting(true)
        const res = await deleteProduct(product.id)
        if (res.success) {
            toast.success("تم حذف المنتج")
            onRefresh()
        } else {
            toast.error(res.error ?? "فشل الحذف")
        }
        setIsDeleting(false)
    }

    const hasItems = product._count.items > 0

    return (
        <div className="flex items-center justify-end gap-1">
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => setEditOpen(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>تعديل</TooltipContent>
                </Tooltip>

                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                    disabled={isDeleting}
                                >
                                    {isDeleting
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Trash2 className="h-3.5 w-3.5" />
                                    }
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>حذف</TooltipContent>
                    </Tooltip>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>حذف المنتج &quot;{product.name}&quot;؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                {hasItems
                                    ? `هذا المنتج مرتبط بـ ${product._count.items} صنف. لا يمكن حذفه حتى تُلغي الربط من الأصناف.`
                                    : "سيتم حذف المنتج نهائياً. هذا الإجراء لا يمكن التراجع عنه."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={hasItems}
                                className="rounded-xl bg-destructive hover:bg-destructive/90"
                            >
                                تأكيد الحذف
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>

            <ProductSheet
                open={editOpen}
                onOpenChange={(open) => { setEditOpen(open); if (!open) onRefresh() }}
                product={product}
            />
        </div>
    )
}

export function buildColumns(onRefresh: () => void): ColumnDef<ProductRow>[] {
    return [
        {
            id: "product",
            header: "المنتج",
            enableColumnFilter: true,
            meta: {
                filterType: 'text' as const,
                filterPlaceholder: 'الاسم...',
                cellVariant: 'text' as const,
                align: 'start' as const,
            },
            filterFn: (row, _columnId, filterValue) => {
                return String(row.original.name ?? '').toLowerCase().includes(String(filterValue).toLowerCase())
            },
            size: 260,
            cell: ({ row }) => (
                <span className="font-semibold text-sm text-foreground truncate">{row.original.name}</span>
            ),
        },
        {
            accessorKey: "code",
            enableColumnFilter: true,
            meta: {
                filterType: 'text' as const,
                filterPlaceholder: 'الكود...',
                cellVariant: 'code' as const,
                align: 'start' as const,
            },
            header: "الكود",
            size: 120,
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className="text-xs tracking-wide bg-primary/5 border-primary/20 text-primary font-mono"
                    dir="ltr"
                >
                    {row.original.code}
                </Badge>
            ),
        },
        {
            id: "brand",
            header: "البراند",
            enableColumnFilter: false,
            meta: { cellVariant: 'text' as const, align: 'start' as const },
            size: 140,
            cell: ({ row }) => (
                <span className="text-xs truncate">{row.original.brand?.name ?? "—"}</span>
            ),
        },
        {
            id: "category",
            header: "التصنيف",
            enableColumnFilter: false,
            meta: { cellVariant: 'text' as const, align: 'start' as const },
            size: 140,
            cell: ({ row }) => (
                <span className="text-xs truncate">{row.original.category?.name ?? "—"}</span>
            ),
        },
        {
            id: "items",
            enableColumnFilter: false,
            meta: { cellVariant: 'number' as const, align: 'end' as const },
            header: "الأصناف",
            size: 90,
            cell: ({ row }) => {
                const count = row.original._count.items
                return (
                    <Badge
                        variant={count > 0 ? "secondary" : "outline"}
                        className={cn(
                            "text-xs tabular-nums",
                            count > 0 && "bg-primary/10 text-primary border-primary/20",
                        )}
                    >
                        {count} صنف
                    </Badge>
                )
            },
        },
        {
            id: "actions",
            enableColumnFilter: false,
            enableSorting: false,
            meta: { cellVariant: 'actions' as const, sticky: 'actions' as const, align: 'end' as const },
            header: "الإجراءات",
            size: 90,
            cell: ({ row }) => <ActionCell product={row.original} onRefresh={onRefresh} />,
        },
    ]
}
