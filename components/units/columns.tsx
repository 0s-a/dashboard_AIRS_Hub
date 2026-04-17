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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { deleteUnit } from "@/lib/actions/units"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

// Plain type (not from Prisma) to handle stale client
export interface UnitRow {
    id: string
    itemNumber: string
    name: string
    pluralName?: string | null
    notes?: string | null
    isActive: boolean
    createdAt?: string | Date
}

export const columns: ColumnDef<UnitRow>[] = [
    {
        accessorKey: "name",
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
    },
    {
        accessorKey: "isActive",
        header: "الحالة",
        cell: ({ row }) => {
            const isActive = row.original.isActive
            return (
                <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 shadow-none" : ""}>
                    {isActive ? "نشط" : "معطل"}
                </Badge>
            )
        },
    },
    {
        accessorKey: "notes",
        header: "ملاحظات",
        cell: ({ row }) => (
            <div className="max-w-[250px] truncate text-sm text-muted-foreground">
                {row.original.notes || "—"}
            </div>
        ),
    },
    {
        accessorKey: "itemNumber",
        header: "الرقم",
        cell: ({ row }) => (
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                #{row.original.itemNumber}
            </span>
        ),
        size: 80,
    },
    {
        id: "actions",
        cell: function ActionsCell({ row }) {
            const router = useRouter()
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const unit = row.original

            const handleDelete = async () => {
                const res = await deleteUnit(unit.id)
                if (res.success) {
                    toast.success("تم حذف الوحدة")
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
                                    window.dispatchEvent(new CustomEvent("edit-unit", { detail: unit }))
                                }}
                            >
                                <Pencil className="ml-2 h-4 w-4" />
                                تعديل
                            </DropdownMenuItem>
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
                </>
            )
        },
    },
]
