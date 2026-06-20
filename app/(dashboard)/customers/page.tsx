import { getCustomers, getCustomerStats } from "@/lib/actions/customers"
import { Users, UserPlus, UserX } from "lucide-react"
import { CustomerSheet } from "@/components/customers/customer-sheet"
import { Button } from "@/components/ui/button"
import { CustomersTable } from "./components/customers-table"

export const dynamic = "force-dynamic"

export default async function CRMPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>
}) {
    const params = await searchParams
    const page = parseInt(params.page ?? "1", 10)

    const [result, statsResult] = await Promise.all([
        getCustomers({ page, pageSize: 100, search: params.search }),
        getCustomerStats(),
    ])

    const { customers: rawCustomers = [] } = (result.success ? result.data : { customers: [] }) as any
    const { total = 0, newInWeek = 0, disabled = 0 } = (statsResult.success ? statsResult.data : {}) as any

    const customers = rawCustomers.map((p: any) => ({
        ...p,
        resolvedCurrencies: (p.customerCurrencies || []).map((pc: any) => pc.currency).filter(Boolean)
    }))

    const stats = [
        { label: "إجمالي العملاء", value: total, icon: Users, color: "text-blue-600", bgColor: "bg-blue-500/10" },
        { label: "أعضاء جدد (٧ أيام)", value: newInWeek, icon: UserPlus, color: "text-violet-600", bgColor: "bg-violet-500/10" },
        { label: "عملاء معطّلون", value: disabled, icon: UserX, color: "text-red-500", bgColor: "bg-red-500/10" },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">
                        إدارة العملاء
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة قاعدة بيانات العملاء وتتبع نشاطهم وتصنيفاتهم
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <CustomerSheet
                        mode="create"
                        trigger={
                            <Button className="rounded-xl gap-2">
                                <UserPlus className="h-4 w-4" />
                                عميل جديد
                            </Button>
                        }
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat, i) => (
                    <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-primary/20 group">
                        <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <h3 className="text-2xl font-bold font-mono tracking-tight">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <main className="rounded-2xl border bg-card shadow-sm overflow-hidden p-1">
                <CustomersTable data={customers} />
            </main>
        </div>
    )
}
