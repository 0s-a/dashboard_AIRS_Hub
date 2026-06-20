import { getWhatsappGroups, getWhatsappGroupStats } from "@/lib/actions/whatsapp-groups"
import { getCustomers } from "@/lib/actions/customers"
import { getSupervisors } from "@/lib/actions/supervisors"
import { WhatsappGroupsList } from "@/components/whatsapp-groups/whatsapp-groups-list"
import { MessageSquare, CheckCircle2, XCircle } from "lucide-react"
import { CreateGroupButton } from "./components/create-group-button"

export const dynamic = "force-dynamic"

export default async function WhatsappGroupsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const page = Number(searchParams.page) || 1
    const limit = Number(searchParams.limit) || 25
    const search = typeof searchParams.search === 'string' ? searchParams.search : undefined

    const [groupsRes, statsRes, customersRes, supervisorsRes] = await Promise.all([
        getWhatsappGroups({ activeOnly: false, page, pageSize: limit, search }),
        getWhatsappGroupStats(),
        getCustomers({ pageSize: 500 }),
        getSupervisors({ activeOnly: true, pageSize: 500 }),
    ])

    const groupsData = groupsRes.success && groupsRes.data ? (groupsRes.data as any) : { groups: [], total: 0, page: 1, pageSize: limit }
    const groups = groupsData.groups || []
    
    const paginationMeta = {
        page: groupsData.page || 1,
        limit: groupsData.pageSize || limit,
        total: groupsData.total || 0,
        pages: Math.ceil((groupsData.total || 0) / (groupsData.pageSize || limit)),
        hasPrev: (groupsData.page || 1) > 1,
        hasNext: (groupsData.page || 1) < Math.ceil((groupsData.total || 0) / (groupsData.pageSize || limit))
    }

    const customers = (customersRes.success && customersRes.data ? (customersRes.data as any).customers : []) as any[]
    const supervisors = (supervisorsRes.success && supervisorsRes.data ? (supervisorsRes.data as any).supervisors : []) as any[]

    // إحصائيات
    const statsData = statsRes.success && statsRes.data ? statsRes.data : { total: 0, active: 0, inactive: 0 }

    const stats = [
        {
            label: "إجمالي",
            value: statsData.total,
            icon: MessageSquare,
            color: "text-emerald-600",
            bgColor: "bg-emerald-500/10",
        },
        {
            label: "نشطة",
            value: statsData.active,
            icon: CheckCircle2,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
        },
        {
            label: "معطّلة",
            value: statsData.inactive,
            icon: XCircle,
            color: "text-muted-foreground",
            bgColor: "bg-muted/60",
        },
    ]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-emerald-600 to-teal-400">
                        مجموعات الواتساب
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        إدارة المجموعات والتواصل مع العملاء والمشرفين
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Compact Stats */}
                    <div className="flex flex-1 sm:flex-none bg-card border border-border/50 rounded-xl p-1 shadow-sm h-10 items-center justify-between sm:justify-start">
                        {stats.map((stat, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 border-l last:border-0 border-border/50">
                                <div className={`size-5 rounded-md ${stat.bgColor} ${stat.color} flex items-center justify-center shrink-0`}>
                                    <stat.icon className="size-3" />
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs text-muted-foreground hidden sm:inline-block">{stat.label}</span>
                                    <span className="text-sm font-bold font-mono">{stat.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="w-full sm:w-auto">
                        <CreateGroupButton customers={customers} supervisors={supervisors} />
                    </div>
                </div>
            </div>

            {/* List */}
            <main>
                <WhatsappGroupsList
                    data={groups}
                    customers={customers}
                    supervisors={supervisors}
                    pagination={paginationMeta}
                    initialSearch={search}
                />
            </main>
        </div>
    )
}
