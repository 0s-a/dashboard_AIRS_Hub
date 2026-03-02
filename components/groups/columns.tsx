"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Group } from "@prisma/client"
import { MoreHorizontal, Pencil, Trash2, UsersRound, Eye } from "lucide-react"
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
import { deleteGroup } from "@/lib/actions/groups"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"

type GroupWithPerson = Group & {
    person?: {
        id: string
        name: string | null
        type: string | null
    } | null
}

export const columns: ColumnDef<GroupWithPerson>[] = [
    {
        accessorKey: "number",
        header: "رقم المجموعة",
        cell: ({ row }) => {
            return (
                <Link href={`/groups/${row.original.id}`} className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/50 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                    {row.original.number}
                </Link>
            )
        },
    },
    {
        accessorKey: "name",
        header: "اسم المجموعة",
        cell: ({ row }) => {
            return (
                <Link href={`/groups/${row.original.id}`} className="flex items-center gap-2 group cursor-pointer">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <UsersRound className="size-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm group-hover:text-primary transition-colors">{row.original.name}</span>
                </Link>
            )
        },
    },
    {
        accessorKey: "tags",
        header: "الوسوم",
        cell: ({ row }) => {
            const tags = (row.original.tags as string[] | null) || []

            if (tags.length === 0) {
                return <span className="text-xs text-muted-foreground italic">لا توجد وسوم</span>
            }

            return (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-medium px-1.5 py-0 h-5">
                            {tag}
                        </Badge>
                    ))}
                    {tags.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                            +{tags.length - 3}
                        </Badge>
                    )}
                </div>
            )
        },
    },
    {
        id: "person",
        header: "الشخص المرتبط",
        cell: ({ row }) => {
            const person = row.original.person
            return (
                <div className="flex justify-center">
                    {person ? (
                        <Link href={`/persons/${person.id}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer text-xs font-medium">
                            <UsersRound className="size-3" />
                            <span className="truncate max-w-[120px]">{person.name || "بدون اسم"}</span>
                        </Link>
                    ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground italic h-6">
                            لا يوجد المالك
                        </Badge>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "createdAt",
        header: "تاريخ الإنشاء",
        cell: ({ row }) => {
            const date = new Date(row.original.createdAt)
            return (
                <div className="text-sm text-muted-foreground">
                    {date.toLocaleDateString("ar-SA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </div>
            )
        },
    },
    {
        id: "actions",
        cell: function ActionsCell({ row }) {
            const router = useRouter()
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
            const group = row.original

            const handleDelete = async () => {
                const res = await deleteGroup(group.id)
                if (res.success) {
                    toast.success("تم حذف المجموعة")
                    router.refresh()
                } else {
                    toast.error(res.error || "حدث خطأ ما")
                }
                setIsDeleteDialogOpen(false)
            }

            return (
                <div className="flex justify-end pr-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">فتح القائمة</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">إجراءات</DropdownMenuLabel>

                            <DropdownMenuItem asChild>
                                <Link href={`/groups/${group.id}`} className="cursor-pointer">
                                    <Eye className="ml-2 h-4 w-4 text-blue-500" />
                                    عرض التفاصيل
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => {
                                    const event = new CustomEvent("edit-group", {
                                        detail: group
                                    })
                                    window.dispatchEvent(event)
                                }}
                                className="cursor-pointer"
                            >
                                <Pencil className="ml-2 h-4 w-4 text-amber-500" />
                                تعديل
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                className="text-destructive cursor-pointer"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هل أنت متأكد من رغبتك في حذف المجموعة &quot;<strong className="text-foreground">{group.name}</strong>&quot; نهائياً؟
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse sm:justify-start gap-2">
                                <AlertDialogCancel className="mt-0">إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    حذف نهائي
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )
        },
    },
]
