"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Color } from "@prisma/client"
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
import { deleteColor } from "@/lib/actions/colors"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Color>[] = [
    {
        accessorKey: "code",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'الكود...' },
        header: () => <div className="text-start pe-0">الكود</div>,
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <span
                    className="h-5 w-5 rounded-full border shrink-0"
                    style={{ backgroundColor: row.original.hexCode }}
                />
                <span className="font-mono text-sm font-bold tracking-widest bg-primary/10 text-primary rounded-md px-2 py-1">
                    {row.original.code}
                </span>
            </div>
        ),
    },
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'اسم اللون...' },
        header: () => <div className="text-start pe-0">اللون</div>,
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
        accessorKey: "hexCode",
        header: () => <div className="text-start pe-0">HEX</div>,
        cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground" dir="ltr">{row.original.hexCode}</span>
        ),
    },
    {
        accessorKey: "isActive",
        header: () => <div className="text-start pe-0">الحالة</div>,
        cell: ({ row }) => (
            <Badge variant={row.original.isActive ? "default" : "secondary"}>
                {row.original.isActive ? "نشط" : "معطّل"}
            </Badge>
        ),
    },
    {
        id: "actions",
        enableColumnFilter: false,
        header: () => <div className="text-start pe-0">الإجراءات</div>,
        cell: function ActionsCell({ row }) {
            const router = useRouter()
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const color = row.original

            const handleDelete = async () => {
                const res = await deleteColor(color.id)
                if (res.success) {
                    toast.success("تم حذف اللون")
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
                                    window.dispatchEvent(new CustomEvent("edit-color", { detail: color }))
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
                                    سيتم حذف اللون &quot;{color.name}&quot; — لا يمكن حذف ألوان مرتبطة بأصناف.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
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
