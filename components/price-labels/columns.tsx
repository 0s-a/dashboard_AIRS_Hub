"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PriceLabel } from "@prisma/client"
import { MoreHorizontal, Pencil, Trash2, Star, StarOff } from "lucide-react"
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
        meta: { filterType: 'text' as const },
        header: "الرقم",
        cell: ({ row }) => (
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                {row.original.itemNumber}
            </span>
        ),
        size: 80,
    },
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'اسم التسعيرة...' },
        header: "اسم التسعيرة",
        cell: ({ row }) => {
            return (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{row.original.name}</span>
                    {row.original.isDefault && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30 gap-1 text-[10px]">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            افتراضية
                        </Badge>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "isDefault",
        enableColumnFilter: false,
        header: "الافتراضية",
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
        }
    },
    {
        accessorKey: "notes",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const },
        header: "ملاحظات",
        cell: ({ row }) => {
            const notes = row.original.notes
            return (
                <div className="max-w-[400px] truncate text-sm text-muted-foreground">
                    {notes || "—"}
                </div>
            )
        },
    },
    {
        accessorKey: "createdAt",
        enableColumnFilter: true,
        meta: { filterType: 'date-range' as const },
        filterFn: (row: any, _columnId: string, filterValue: any) => {
            const date = new Date(row.original.createdAt)
            const d = date.toISOString().split('T')[0]
            if (filterValue.from && d < filterValue.from) return false
            if (filterValue.to && d > filterValue.to) return false
            return true
        },
        header: "تاريخ الإنشاء",
        cell: ({ row }) => {
            return (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.original.createdAt).toLocaleDateString('ar-SA')}
                </div>
            )
        },
    },
    {
        id: "actions",
        enableColumnFilter: false,
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
