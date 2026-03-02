import { DataTable } from "@/components/ui/data-table"
import { columns } from "../../../components/columns"
import { getPersons } from "@/lib/actions/persons"
import { PersonSheet } from "@/components/persons/person-sheet"

export default async function CRMPage() {
    const result = await getPersons()
    const persons = result.success ? result.data : []
    const totalPersons = persons.length

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">
                        إدارة الأشخاص
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة قاعدة بيانات الأشخاص وتتبع نشاطهم
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end px-4 py-2 bg-muted/30 rounded-xl border border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">إجمالي الأشخاص</span>
                        <span className="text-xl font-bold text-primary font-mono">{totalPersons}</span>
                    </div>
                    <PersonSheet />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={persons}
                searchPlaceholder="ابحث عن اسم الشخص، رقم الهاتف أو البريد..."
            />
        </div>
    )
}
