"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
import { MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
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
import { deleteCategory, toggleCategoryStatus } from "@/lib/actions/categories"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

export const columns: ColumnDef<Category>[] = [
    {
        accessorKey: "itemNumber",
        header: "رقم الصنف",
        cell: ({ row }) => {
            const itemNumber = row.original.itemNumber
            return (
                <div className="font-mono text-sm font-medium">
                    {itemNumber || "—"}
                </div>
            )
        },
    },
    {
        accessorKey: "name",
        header: "التصنيف",
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
        header: "الوصف",
        cell: ({ row }) => {
            const description = row.original.description
            return (
                <div className="max-w-[300px] truncate text-sm text-muted-foreground">
                    {description || "—"}
                </div>
            )
        },
    },


    {
        accessorKey: "isActive",
        header: "الحالة",
        cell: ({ row }) => {
            const isActive = row.original.isActive
            return (
                <Badge variant={isActive ? "default" : "outline"}>
                    {isActive ? "نشط" : "غير نشط"}
                </Badge>
            )
        },
    },
    {
        id: "actions",
        cell: function ActionsCell({ row }) {
            const router = useRouter()
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const category = row.original

            const handleToggleStatus = async () => {
                const res = await toggleCategoryStatus(category.id, category.isActive)
                if (res.success) {
                    toast.success(`تم ${category.isActive ? "تعطيل" : "تفعيل"} التصنيف`)
                    router.refresh()
                } else {
                    toast.error("حدث خطأ ما")
                }
            }

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
                                    // This will be handled by the parent page component
                                    const event = new CustomEvent("edit-category", {
                                        detail: category
                                    })
                                    window.dispatchEvent(event)
                                }}
                            >
                                <Pencil className="ml-2 h-4 w-4" />
                                تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleToggleStatus}>
                                {category.isActive ? (
                                    <>
                                        <ToggleLeft className="ml-2 h-4 w-4" />
                                        تعطيل
                                    </>
                                ) : (
                                    <>
                                        <ToggleRight className="ml-2 h-4 w-4" />
                                        تفعيل
                                    </>
                                )}
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
                                    سيتم حذف التصنيف "{category.name}" بشكل نهائي.

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
