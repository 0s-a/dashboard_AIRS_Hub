import { DataTable } from "@/components/ui/data-table"
import { columns } from "../../../components/columns"
import { getPersons } from "@/lib/actions/persons"
import { getCurrencies } from "@/lib/actions/currencies"
import { PersonSheet } from "@/components/persons/person-sheet"
import { Users, UserCheck, UserPlus, Layers } from "lucide-react"
import { PersonExpandedRow } from "./components/person-expanded-row"

export const dynamic = "force-dynamic"

export default async function CRMPage() {
    const result = await getPersons()
    const currenciesResult = await getCurrencies()
    const allCurrencies = (currenciesResult.success ? currenciesResult.data : []) as any[]
    
    // Build lookup map
    const currencyMap = new Map(allCurrencies.map((c: any) => [c.id, { name: c.name, symbol: c.symbol, code: c.code }]))
    
    const rawPersons = (result.success ? result.data : []) as any[]
    // Enrich persons with resolved currencies
    const persons = rawPersons.map(p => ({
        ...p,
        resolvedCurrencies: ((p.currencies as string[]) || []).map((id: string) => currencyMap.get(id)).filter(Boolean)
    }))
    
    const totalPersons = persons.length
    const activePersons = persons.filter(p => p.isActive).length
    const withGroups = persons.filter(p => p.groups && p.groups.length > 0).length
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const latestMembers = persons.filter(p => new Date(p.createdAt) >= sevenDaysAgo).length

    const stats = [
        {
            label: "إجمالي الأشخاص",
            value: totalPersons,
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
        },
        {
            label: "النشطون الآن",
            value: activePersons,
            icon: UserCheck,
            color: "text-emerald-600",
            bgColor: "bg-emerald-500/10",
        },
        {
            label: "أعضاء جدد (٧ أيام)",
            value: latestMembers,
            icon: UserPlus,
            color: "text-violet-600",
            bgColor: "bg-violet-500/10",
        },
        {
            label: "مرتبطون بمجموعات",
            value: withGroups,
            icon: Layers,
            color: "text-amber-600",
            bgColor: "bg-amber-500/10",
        },
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
                    <PersonSheet />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    groupingOptions={[
                        { id: "type", label: "نوع الشخص" },
                        { id: "isActive", label: "الحالة (نشط/غير نشط)" },
                        { id: "source", label: "المصدر" },
                    ]}
                    renderSubComponent={PersonExpandedRow}
                />
            </main>
        </div>
    )
}
