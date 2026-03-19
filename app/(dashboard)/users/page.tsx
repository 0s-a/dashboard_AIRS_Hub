"use client"

import { useState, useEffect } from "react"
import { Plus, Users, UserCheck, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserSheet } from "@/components/users/user-sheet"
import { UserTable } from "@/components/users/user-table"
import { getUsers } from "@/lib/actions/users"
import type { UserRow } from "@/components/users/user-columns"

export default function UsersPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserRow | undefined>()
    const [users, setUsers] = useState<UserRow[]>([])

    const loadUsers = async () => {
        const res = await getUsers()
        if (res.success && res.data) setUsers(res.data as UserRow[])
    }

    useEffect(() => {
        loadUsers()

        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            setSelectedUser(customEvent.detail)
            setIsSheetOpen(true)
        }

        const handleRefresh = () => loadUsers()

        window.addEventListener("edit-user", handleEdit)
        window.addEventListener("refresh-users", handleRefresh)
        return () => {
            window.removeEventListener("edit-user", handleEdit)
            window.removeEventListener("refresh-users", handleRefresh)
        }
    }, [])

    const handleSheetClose = (open: boolean) => {
        if (!open) {
            setIsSheetOpen(false)
            setSelectedUser(undefined)
            loadUsers()
        }
    }

    const activeUsers = users.filter(u => u.isActive)
    const lastLogin = users
        .filter(u => u.lastLogin)
        .sort((a, b) => new Date(b.lastLogin!).getTime() - new Date(a.lastLogin!).getTime())[0]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        إدارة المستخدمين
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        أضف وعدّل حسابات المستخدمين في النظام
                    </p>
                </div>
                <Button onClick={() => { setSelectedUser(undefined); setIsSheetOpen(true) }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة مستخدم
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي المستخدمين</p>
                            <h3 className="text-3xl font-bold mt-2">{users.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="size-6 text-primary" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">المستخدمون النشطون</p>
                            <h3 className="text-3xl font-bold mt-2">{activeUsers.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <UserCheck className="size-6 text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">آخر تسجيل دخول</p>
                            <h3 className="text-lg font-bold mt-2 truncate">
                                {lastLogin
                                    ? `${lastLogin.name}`
                                    : "لا يوجد"
                                }
                            </h3>
                        </div>
                        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Clock className="size-6 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <UserTable data={users} />
            </div>

            {/* Sheet */}
            <UserSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                user={selectedUser}
            />
        </div>
    )
}
