import { ShieldAlert, ShieldCheck, UserPlus } from "lucide-react"
import { getSupervisors } from "@/lib/actions/supervisors"
import { SupervisorsClient } from "@/components/supervisors/supervisors-client"
import type { SupervisorRow } from "@/components/supervisors/supervisor-columns"

export const dynamic = "force-dynamic"

export default async function SupervisorsPage() {
    const res = await getSupervisors({ activeOnly: false, pageSize: 500 })
    const supervisors = (res.success && res.data ? (res.data as any).supervisors : []) as SupervisorRow[]

    const activeSupervisors = supervisors.filter(s => s.isActive)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newSupervisors = supervisors.filter(s => new Date(s.createdAt) >= sevenDaysAgo)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-violet-600 to-indigo-400 bg-clip-text text-transparent">
                        إدارة المشرفين
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        المشرفون المسؤولون عن إدارة مجموعات الواتساب
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي المشرفين</p>
                            <h3 className="text-3xl font-bold mt-2">{supervisors.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <ShieldAlert className="size-6 text-violet-600" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">المشرفون النشطون</p>
                            <h3 className="text-3xl font-bold mt-2">{activeSupervisors.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <ShieldCheck className="size-6 text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">أعضاء جدد (٧ أيام)</p>
                            <h3 className="text-3xl font-bold mt-2">{newSupervisors.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <UserPlus className="size-6 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Table */}
            <SupervisorsClient initialSupervisors={supervisors} />
        </div>
    )
}
