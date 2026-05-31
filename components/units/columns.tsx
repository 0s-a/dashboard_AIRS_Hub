"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { deleteUnit } from "@/lib/actions/units"
import { toast } from "sonner"
import { useState } from "react"

// Plain type (not from Prisma) to handle stale client
export interface UnitRow {
    id: string
    itemNumber: string
    name: string
    pluralName?: string | null
    notes?: string | null
    createdAt?: string | Date
}

export const columns: ColumnDef<UnitRow>[] = [
    {
        accessorKey: "itemNumber",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'الرقم...' },
        header: "الرقم",
        cell: ({ row }) => (
            <span className="text-xs font-mono text-muted-foreground">
                {row.original.itemNumber}
            </span>
        ),
        size: 100,
    },
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'اسم الوحدة...' },
        header: "الوحدة",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0 shadow-xs">
                    {row.original.name.charAt(0)}
                </div>
                <div>
                    <div className="font-medium">{row.original.name}</div>
                    {row.original.pluralName && (
                        <div className="text-xs text-muted-foreground">{row.original.pluralName}</div>
                    )}
                </div>
            </div>
        ),
        size: 250,
    },

    {
        accessorKey: "notes",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const },
        header: "ملاحظات",
        cell: ({ row }) => (
            <div className="max-w-[250px] truncate text-sm text-muted-foreground">
                {row.original.notes || "—"}
            </div>
        ),
        size: 300,
    },
    {
        id: "actions",
        enableColumnFilter: false,
        header: "الإجراءات",
        cell: function ActionsCell({ row }) {
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const unit = row.original

            const handleDelete = async () => {
                const res = await deleteUnit(unit.id)
                if (res.success) {
                    toast.success("تم حذف الوحدة")
                    window.dispatchEvent(new Event("refresh-units"))
                } else {
                    toast.error(res.error || "حدث خطأ ما")
                }
                setIsDeleteDialogOpen(false)
            }

            return (
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary" 
                        onClick={() => window.dispatchEvent(new CustomEvent("edit-unit", { detail: unit }))}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    سيتم حذف وحدة &quot;{unit.name}&quot; نهائياً.
                                    لا يمكن حذف وحدة مرتبطة بأسعار منتجات.
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
                </div>
            )
        },
        size: 150,
    },
]
