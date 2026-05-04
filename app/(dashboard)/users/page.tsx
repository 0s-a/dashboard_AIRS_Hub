import { Users, UserCheck, Clock } from "lucide-react"
import { getUsers } from "@/lib/actions/users"
import { UsersClient } from "@/components/users/users-client"
import type { UserRow } from "@/components/users/user-columns"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
    const res = await getUsers()
    const users = (res.success && res.data ? res.data : []) as UserRow[]

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
                {/* Add button rendered inside UsersClient */}
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
                                {lastLogin ? lastLogin.name : "لا يوجد"}
                            </h3>
                        </div>
                        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Clock className="size-6 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive part */}
            <UsersClient initialUsers={users} />
        </div>
    )
}
