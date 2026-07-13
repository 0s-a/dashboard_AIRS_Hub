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
import { deleteProductAttribute } from "@/lib/actions/product-attributes"
import type { SerializedProductAttributeCatalog } from "@/lib/types/product-attribute"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function createColumns(opts: {
    onEdit: (attr: SerializedProductAttributeCatalog) => void
}): ColumnDef<SerializedProductAttributeCatalog>[] {
    return [
        {
            accessorKey: "code",
            enableColumnFilter: true,
            meta: {
                filterType: "text" as const,
                filterPlaceholder: "الكود...",
                cellVariant: "code" as const,
                align: "start" as const,
            },
            header: "الكود",
            size: 120,
            cell: ({ row }) => (
                <span className="font-bold tracking-wide bg-primary/10 text-primary rounded-md px-2 py-1 truncate inline-block">
                    {row.original.code}
                </span>
            ),
        },
        {
            accessorKey: "name",
            enableColumnFilter: true,
            meta: {
                filterType: "text" as const,
                filterPlaceholder: "اسم الصفة...",
                cellVariant: "text" as const,
                align: "start" as const,
            },
            header: "الاسم",
            size: 180,
            cell: ({ row }) => <div className="font-medium truncate">{row.original.name}</div>,
        },
        {
            id: "examples",
            enableColumnFilter: false,
            meta: { cellVariant: "text" as const, align: "start" as const },
            header: "أمثلة",
            size: 220,
            cell: ({ row }) => {
                const examples = row.original.examples ?? []
                if (!examples.length) {
                    return <span className="text-muted-foreground text-sm">—</span>
                }
                return (
                    <span className="text-sm text-muted-foreground truncate block" title={examples.join("، ")}>
                        {examples.slice(0, 4).join("، ")}
                        {examples.length > 4 ? ` +${examples.length - 4}` : ""}
                    </span>
                )
            },
        },
        {
            id: "valuesCount",
            enableColumnFilter: false,
            meta: { cellVariant: "number" as const, align: "end" as const },
            header: "الاستخدام",
            size: 100,
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground tabular-nums">
                    {row.original.valuesCount ?? 0} منتج
                </span>
            ),
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
                const attribute = row.original

                const handleDelete = async () => {
                    const res = await deleteProductAttribute(attribute.id)
                    if (res.success) {
                        toast.success("تم حذف الصفة")
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
                                <DropdownMenuItem onClick={() => opts.onEdit(attribute)}>
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
                                        سيتم حذف الصفة &quot;{attribute.name}&quot; — لا يمكن حذف صفات مرتبطة بمنتجات.
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
}
