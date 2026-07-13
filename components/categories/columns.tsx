"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
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
import { deleteCategory } from "@/lib/actions/categories"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

export const columns: ColumnDef<Category>[] = [
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
            <div className="font-bold tracking-widest bg-primary/10 text-primary rounded-md px-2 py-1 inline-block truncate">
                {row.original.code}
            </div>
        ),
    },
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: {
            filterType: 'text' as const,
            filterPlaceholder: 'اسم التصنيف...',
            cellVariant: 'text' as const,
            align: 'start' as const,
        },
        header: "التصنيف",
        size: 200,
        cell: ({ row }) => (
            <div className="font-medium truncate">{row.original.name}</div>
        ),
    },
    {
        accessorKey: "description",
        enableColumnFilter: true,
        meta: {
            filterType: 'text' as const,
            cellVariant: 'text' as const,
            align: 'start' as const,
        },
        header: "الوصف",
        size: 280,
        cell: ({ row }) => (
            <div className="truncate text-sm text-muted-foreground">
                {row.original.description || "—"}
            </div>
        ),
    },
    {
        id: "actions",
        enableColumnFilter: false,
        enableSorting: false,
        meta: { cellVariant: 'actions' as const, sticky: 'actions' as const, align: 'end' as const },
        header: "الإجراءات",
        size: 90,
        cell: function ActionsCell({ row }) {
            const router = useRouter()
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const category = row.original

            const handleDelete = async () => {
                const res = await deleteCategory(category.id)
                if (res.success) {
                    toast.success("تم حذف التصنيف")
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
                                    const event = new CustomEvent("edit-category", {
                                        detail: category,
                                    })
                                    window.dispatchEvent(event)
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
                                    سيتم حذف التصنيف &quot;{category.name}&quot; بشكل نهائي.
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
