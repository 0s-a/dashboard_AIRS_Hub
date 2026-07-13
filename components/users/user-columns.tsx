"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX } from "lucide-react"
import { toggleUserActive, deleteUser, getUsers } from "@/lib/actions/users"
import { toast } from "sonner"
import { UserAvatar } from "./user-avatar"

export type UserRow = {
    id: string
    name: string
    username: string
    color: string
    isActive: boolean
    lastLogin: Date | string | null
    createdAt: Date | string
    updatedAt: Date | string
}

interface ColumnCallbacks {
    onEdit: (user: UserRow) => void
    onRefresh: (updated: UserRow[]) => void
}

function formatDate(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export function userColumns({ onEdit, onRefresh }: ColumnCallbacks): ColumnDef<UserRow>[] {
    return [
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: {
            filterType: "text" as const,
            filterPlaceholder: "ابحث بالاسم...",
            cellVariant: "text" as const,
            align: "start" as const,
        },
        header: "المستخدم",
        size: 220,
        minSize: 180,
        maxSize: 280,
        cell: ({ row }) => (
            <div className="flex items-center gap-3 min-w-0">
                <UserAvatar name={row.original.name} color={row.original.color} size="sm" />
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm truncate">{row.original.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono truncate">@{row.original.username}</span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "isActive",
        enableColumnFilter: true,
        meta: {
            filterType: "boolean" as const,
            booleanLabels: { true: "نشط", false: "معطّل", all: "الكل" },
            align: "start" as const,
        },
        filterFn: "boolean",
        header: "الحالة",
        size: 110,
        minSize: 90,
        maxSize: 130,
        cell: ({ row }) => (
            <Badge
                className={row.original.isActive
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"
                    : "bg-muted text-muted-foreground border-0"
                }
            >
                {row.original.isActive ? "نشط" : "معطّل"}
            </Badge>
        ),
    },
    {
        accessorKey: "lastLogin",
        enableColumnFilter: true,
        meta: { filterType: "date-range" as const, align: "start" as const },
        filterFn: "dateRange",
        header: "آخر دخول",
        size: 140,
        minSize: 120,
        maxSize: 170,
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.lastLogin)}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        enableColumnFilter: true,
        meta: { filterType: "date-range" as const, align: "start" as const },
        filterFn: "dateRange",
        header: "تاريخ الإنشاء",
        size: 150,
        minSize: 130,
        maxSize: 180,
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.createdAt)}
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
        cell: ({ row }) => {
            const user = row.original

            const handleToggle = async () => {
                const res = await toggleUserActive(user.id, !user.isActive)
                if (res.success) {
                    toast.success(user.isActive ? "تم تعطيل المستخدم" : "تم تفعيل المستخدم")
                    const fresh = await getUsers()
                    if (fresh.success && fresh.data) onRefresh(fresh.data as UserRow[])
                } else {
                    toast.error(res.error)
                }
            }

            const handleDelete = async () => {
                if (!confirm(`هل تريد حذف المستخدم "${user.name}"؟`)) return
                const res = await deleteUser(user.id)
                if (res.success) {
                    toast.success("تم حذف المستخدم")
                    const fresh = await getUsers()
                    if (fresh.success && fresh.data) onRefresh(fresh.data as UserRow[])
                } else {
                    toast.error(res.error)
                }
            }

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48">
                        <DropdownMenuItem
                            className="gap-2 cursor-pointer font-medium"
                            onClick={() => onEdit(user)}
                        >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                            تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer font-medium" onClick={handleToggle}>
                            {user.isActive ? (
                                <><UserX className="h-4 w-4 text-amber-500" /> تعطيل</>
                            ) : (
                                <><UserCheck className="h-4 w-4 text-emerald-500" /> تفعيل</>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 cursor-pointer font-medium text-destructive focus:text-destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                            حذف
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]}
