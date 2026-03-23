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
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX, ShieldCheck, User } from "lucide-react"
import { toggleUserActive, deleteUser } from "@/lib/actions/users"
import { toast } from "sonner"
import { UserAvatar } from "./user-avatar"

export type UserRow = {
    id: string
    name: string
    username: string
    role: string
    color: string
    isActive: boolean
    lastLogin: Date | string | null
    createdAt: Date | string
    updatedAt: Date | string
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

export const userColumns: ColumnDef<UserRow>[] = [
    {
        accessorKey: "name",
        header: "المستخدم",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <UserAvatar name={row.original.name} color={row.original.color} size="sm" />
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{row.original.name}</span>
                        {row.original.role === "admin" && (
                            <ShieldCheck className="size-3.5 text-primary" />
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">@{row.original.username}</span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "role",
        header: "الدور",
        cell: ({ row }) => (
            row.original.role === "admin" ? (
                <Badge className="bg-primary/10 text-primary border-0 gap-1 font-semibold">
                    <ShieldCheck className="size-3" />
                    مدير
                </Badge>
            ) : (
                <Badge className="bg-muted text-muted-foreground border-0 gap-1 font-semibold">
                    <User className="size-3" />
                    مستخدم
                </Badge>
            )
        ),
    },
    {
        accessorKey: "isActive",
        header: "الحالة",
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
        header: "آخر دخول",
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.lastLogin)}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "تاريخ الإنشاء",
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.createdAt)}
            </span>
        ),
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const user = row.original

            const handleToggle = async () => {
                const res = await toggleUserActive(user.id, !user.isActive)
                if (res.success) {
                    toast.success(user.isActive ? "تم تعطيل المستخدم" : "تم تفعيل المستخدم")
                    window.dispatchEvent(new Event("refresh-users"))
                } else {
                    toast.error(res.error)
                }
            }

            const handleDelete = async () => {
                if (!confirm(`هل تريد حذف المستخدم "${user.name}"؟`)) return
                const res = await deleteUser(user.id)
                if (res.success) {
                    toast.success("تم حذف المستخدم")
                    window.dispatchEvent(new Event("refresh-users"))
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
                            onClick={() => window.dispatchEvent(new CustomEvent("edit-user", { detail: user }))}
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
]
