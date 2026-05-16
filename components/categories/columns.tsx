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
        header: () => <div className="text-start pe-0">الكود</div>,
        cell: ({ row }) => (
            <div className="font-mono text-sm font-bold tracking-widest bg-primary/10 text-primary rounded-md px-2 py-1 inline-block">
                {row.original.code}
            </div>
        ),
    },
    {
        accessorKey: "name",
        header: () => <div className="text-start pe-0">التصنيف</div>,
        cell: ({ row }) => {
            const icon = row.original.icon
            const name = row.original.name
            return (
                <div className="flex items-center gap-2">
                    {icon && <span className="text-xl">{icon}</span>}
                    <div className="font-medium">{name}</div>
                </div>
            )
        },
    },
    {
        accessorKey: "description",
        header: () => <div className="text-start pe-0">الوصف</div>,
        cell: ({ row }) => (
            <div className="max-w-[300px] truncate text-sm text-muted-foreground">
                {row.original.description || "—"}
            </div>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-start pe-0">الإجراءات</div>,
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
