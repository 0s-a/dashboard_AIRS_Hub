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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX, ShieldCheck, User } from "lucide-react"
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
        meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث بالاسم...' },
        header: "المستخدم",
        size: 220,
        minSize: 180,
        maxSize: 280,
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <UserAvatar name={row.original.name} color={row.original.color} size="sm" />
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate max-w-[160px]">{row.original.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">@{row.original.username}</span>
                </div>
            </div>
        ),
    },
    // ── الحالة ───────────────────────────────────────────────
    {
        accessorKey: "isActive",
        enableColumnFilter: true,
        meta: { 
            filterType: 'select' as const,
            filterOptions: [
                { label: "نشط", value: "true" },
                { label: "معطّل", value: "false" }
            ]
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return String(row.original.isActive) === filterValue
        },
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
        meta: { filterType: 'date-range' as const },
        filterFn: (row: any, _columnId: string, filterValue: any) => {
            const date = row.original.lastLogin ? new Date(row.original.lastLogin) : null
            if (!date) return false
            const d = date.toISOString().split('T')[0]
            if (filterValue.from && d < filterValue.from) return false
            if (filterValue.to && d > filterValue.to) return false
            return true
        },
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
        meta: { filterType: 'date-range' as const },
        filterFn: (row: any, _columnId: string, filterValue: any) => {
            const date = new Date(row.original.createdAt)
            const d = date.toISOString().split('T')[0]
            if (filterValue.from && d < filterValue.from) return false
            if (filterValue.to && d > filterValue.to) return false
            return true
        },
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
    // ── عمود الإجراءات ───────────────────────────────────────
    {
        id: "actions",
        enableColumnFilter: false,
        header: "",
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
