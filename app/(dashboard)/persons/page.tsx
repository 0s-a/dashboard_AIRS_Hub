import { DataTable } from "@/components/ui/data-table"
import { columns } from "../../../components/columns"
import { getPersons } from "@/lib/actions/persons"
import { Users, UserCheck, UserPlus, Archive } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function CRMPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>
}) {
    const params = await searchParams
    const page = parseInt(params.page ?? "1", 10)

    const result = await getPersons({ page, pageSize: 100, search: params.search })
    const { persons: rawPersons = [], total = 0 } = (result.success ? result.data : { persons: [], total: 0 }) as any

    const persons = rawPersons.map((p: any) => ({
        ...p,
        resolvedCurrencies: (p.personCurrencies || []).map((pc: any) => pc.currency).filter(Boolean)
    }))

    const totalPersons = persons.length
    const activePersons = persons.filter((p: any) => p.isActive).length

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const latestMembers = persons.filter((p: any) => new Date(p.createdAt) >= sevenDaysAgo).length

    const stats = [
        { label: "إجمالي الأشخاص", value: total, icon: Users, color: "text-blue-600", bgColor: "bg-blue-500/10" },
        { label: "النشطون الآن", value: activePersons, icon: UserCheck, color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
        { label: "أعضاء جدد (٧ أيام)", value: latestMembers, icon: UserPlus, color: "text-violet-600", bgColor: "bg-violet-500/10" },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">
                        إدارة الأشخاص
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة قاعدة بيانات الأشخاص وتتبع نشاطهم وتصنيفاتهم
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/persons/archived">
                        <Button variant="outline" className="rounded-xl gap-2">
                            <Archive className="h-4 w-4" />
                            الأرشيف
                        </Button>
                    </Link>
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
                <DataTable
                    columns={columns}
                    data={persons}
                    searchPlaceholder="ابحث عن اسم الشخص، رقم الهاتف أو البريد..."
                />
            </main>
        </div>
    )
}
