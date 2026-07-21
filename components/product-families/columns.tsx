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

import { deleteProductFamily } from "@/lib/actions/product-families"
import { ProductFamilySheet } from "./product-family-sheet"
import type { ProductFamilyRow } from "@/lib/types/product-family"

export type { ProductFamilyRow }

interface ActionCellProps {
    family: ProductFamilyRow
    onRefresh: () => void
}

function ActionCell({ family, onRefresh }: ActionCellProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    async function handleDelete() {
        setIsDeleting(true)
        const res = await deleteProductFamily(family.id)
        if (res.success) {
            toast.success("تم حذف المنتج الرئيسي")
            onRefresh()
        } else {
            toast.error(res.error ?? "فشل الحذف")
        }
        setIsDeleting(false)
    }

    const hasProducts = family._count.products > 0

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
                            <AlertDialogTitle>حذف المنتج الرئيسي &quot;{family.name}&quot;؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                {hasProducts
                                    ? `هذا المنتج الرئيسي مرتبط بـ ${family._count.products} منتج. لا يمكن حذفه حتى تُلغي الربط من المنتجات.`
                                    : "سيتم حذف المنتج الرئيسي نهائياً. هذا الإجراء لا يمكن التراجع عنه."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={hasProducts}
                                className="rounded-xl bg-destructive hover:bg-destructive/90"
                            >
                                تأكيد الحذف
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>

            <ProductFamilySheet
                open={editOpen}
                onOpenChange={(open) => { setEditOpen(open); if (!open) onRefresh() }}
                family={family}
            />
        </div>
    )
}

export function buildColumns(onRefresh: () => void): ColumnDef<ProductFamilyRow>[] {
    return [
        {
            id: "family",
            header: "المنتج الرئيسي",
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
            size: 280,
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
            id: "products",
            enableColumnFilter: false,
            meta: { cellVariant: 'number' as const, align: 'end' as const },
            header: "المنتجات",
            size: 90,
            cell: ({ row }) => {
                const count = row.original._count.products
                return (
                    <Badge
                        variant={count > 0 ? "secondary" : "outline"}
                        className={cn(
                            "text-xs tabular-nums",
                            count > 0 && "bg-primary/10 text-primary border-primary/20",
                        )}
                    >
                        {count} منتج
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
            cell: ({ row }) => <ActionCell family={row.original} onRefresh={onRefresh} />,
        },
    ]
}
