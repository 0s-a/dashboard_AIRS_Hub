import { getWhatsappGroups } from "@/lib/actions/whatsapp-groups"
import { getCustomers } from "@/lib/actions/customers"
import { getSupervisors } from "@/lib/actions/supervisors"
import { WhatsappGroupsTable } from "@/components/whatsapp-groups/whatsapp-groups-table"
import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, CheckCircle2, XCircle } from "lucide-react"
import { CreateGroupButton } from "./components/create-group-button"

export const dynamic = "force-dynamic"

export default async function WhatsappGroupsPage() {
    const [groupsRes, customersRes, supervisorsRes] = await Promise.all([
        getWhatsappGroups({ activeOnly: false }),
        getCustomers({ pageSize: 500 }),
        getSupervisors({ activeOnly: true, pageSize: 500 }),
    ])

    const groups = (groupsRes.success && groupsRes.data ? (groupsRes.data as any).groups : []) as any[]
    const customers = (customersRes.success && customersRes.data ? (customersRes.data as any).customers : []) as any[]
    const supervisors = (supervisorsRes.success && supervisorsRes.data ? (supervisorsRes.data as any).supervisors : []) as any[]

    // إحصائيات
    const totalGroups   = groups.length
    const activeGroups  = groups.filter((g: any) => g.isActive).length
    const inactiveGroups = groups.filter((g: any) => !g.isActive).length

    const stats = [
        {
            label: "إجمالي المجموعات",
            value: totalGroups,
            icon: MessageSquare,
            color: "text-emerald-600",
            bgColor: "bg-emerald-500/10",
        },
        {
            label: "مجموعات نشطة",
            value: activeGroups,
            icon: CheckCircle2,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
        },
        {
            label: "مجموعات معطّلة",
            value: inactiveGroups,
            icon: XCircle,
            color: "text-muted-foreground",
            bgColor: "bg-muted/60",
        },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-emerald-600 to-teal-400">
                        مجموعات الواتساب
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        إدارة مجموعات الواتساب وربطها بالعملاء والمشرفين
                    </p>
                </div>
                <CreateGroupButton customers={customers} supervisors={supervisors} />
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border bg-card p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-primary/20 group"
                    >
                        <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <h3 className="text-2xl font-bold font-mono tracking-tight">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <main className="rounded-2xl border bg-card shadow-sm overflow-hidden p-1">
                <WhatsappGroupsTable
                    data={groups}
                    customers={customers}
                    supervisors={supervisors}
                />
            </main>
        </div>
    )
}
