"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PriceLabel } from "@prisma/client"
import { MoreHorizontal, Pencil, Trash2, Star, StarOff, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deletePriceLabel, setDefaultPriceLabel } from "@/lib/actions/price-labels"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

export const columns: ColumnDef<PriceLabel>[] = [
    {
        accessorKey: "itemNumber",
        enableColumnFilter: true,
        meta: {
            filterType: "text" as const,
            cellVariant: "code" as const,
            align: "start" as const,
        },
        header: "الرقم",
        cell: ({ row }) => (
            <span className="truncate text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                {row.original.itemNumber}
            </span>
        ),
        size: 80,
    },
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: {
            filterType: "text" as const,
            filterPlaceholder: "اسم التسعيرة...",
            cellVariant: "text" as const,
            align: "start" as const,
        },
        header: "اسم التسعيرة",
        size: 200,
        cell: ({ row }) => {
            return (
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{row.original.name}</span>
                    {row.original.isDefault && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30 gap-1 text-[10px] shrink-0">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            افتراضية
                        </Badge>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "customerType",
        enableColumnFilter: true,
        meta: {
            filterType: "text" as const,
            filterPlaceholder: "نوع العميل...",
            cellVariant: "text" as const,
            align: "start" as const,
        },
        header: "نوع العميل",
        size: 160,
        cell: ({ row }) => {
            const ct = (row.original as PriceLabel & { customerType?: string | null }).customerType
            if (!ct) return <span className="text-muted-foreground text-xs">—</span>
            return (
                <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:border-indigo-500/30 text-[11px] font-medium">
                    {ct}
                </Badge>
            )
        },
    },
    {
        id: "customersCount",
        enableColumnFilter: false,
        meta: { cellVariant: "number" as const, align: "end" as const },
        header: "العملاء",
        size: 90,
        cell: ({ row }) => {
            const count = (row.original as PriceLabel & { _count?: { customers?: number } })._count?.customers ?? 0
            return (
                <div className="flex items-center justify-end gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={count > 0 ? "text-foreground font-semibold tabular-nums" : "text-muted-foreground"}>{count}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "isDefault",
        enableColumnFilter: false,
        meta: { align: "start" as const },
        header: "الافتراضية",
        size: 140,
        cell: ({ row }) => {
            const label = row.original
            if (label.isDefault) {
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30 gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        افتراضية
                    </Badge>
                )
            }
            return (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-amber-600"
                    onClick={async () => {
                        const res = await setDefaultPriceLabel(label.id)
                        if (res.success) toast.success("تم تعيينها كتسعيرة افتراضية")
                        else toast.error(res.error)
                    }}
                >
                    <StarOff className="h-3 w-3" />
                    تعيين افتراضية
                </Button>
            )
        },
    },
    {
        accessorKey: "notes",
        enableColumnFilter: true,
        meta: {
            filterType: "text" as const,
            cellVariant: "text" as const,
            align: "start" as const,
        },
        header: "ملاحظات",
        size: 220,
        cell: ({ row }) => {
            const notes = row.original.notes
            return (
                <div className="truncate text-sm text-muted-foreground">
                    {notes || "—"}
                </div>
            )
        },
    },
    {
        accessorKey: "createdAt",
        enableColumnFilter: true,
        meta: { filterType: "date-range" as const, align: "start" as const },
        filterFn: "dateRange",
        header: "تاريخ الإنشاء",
        size: 140,
        cell: ({ row }) => {
            return (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.original.createdAt).toLocaleDateString("ar-SA")}
                </div>
            )
        },
    },
    {
        id: "actions",
        enableColumnFilter: false,
        enableSorting: false,
        meta: { cellVariant: "actions" as const, sticky: "actions" as const, align: "end" as const },
        header: "الإجراءات",
        size: 90,
        cell: function ActionsCell({ row }) {
            const router = useRouter()
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const label = row.original

            const handleDelete = async () => {
                const res = await deletePriceLabel(label.id)
                if (res.success) {
                    toast.success("تم حذف التسعيرة")
                    router.refresh()
                } else {
                    toast.error(res.error || "حدث خطأ ما")
                }
                setIsDeleteDialogOpen(false)
            }

            return (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    const event = new CustomEvent("edit-price-label", {
                                        detail: label
                                    })
                                    window.dispatchEvent(event)
                                }}
                            >
                                <Pencil className="ml-2 h-4 w-4" />
                                تعديل
                            </DropdownMenuItem>
                            {!label.isDefault && (
                                <DropdownMenuItem
                                    onClick={async () => {
                                        const res = await setDefaultPriceLabel(label.id)
                                        if (res.success) toast.success("تم تعيينها كتسعيرة افتراضية")
                                        else toast.error(res.error)
                                    }}
                                >
                                    <Star className="ml-2 h-4 w-4" />
                                    تعيين كافتراضية
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    سيتم حذف التسعيرة &quot;{label.name}&quot; بشكل نهائي.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    حذف
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )
        },
    },
]
