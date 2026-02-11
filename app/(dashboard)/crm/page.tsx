import { DataTable } from "@/components/ui/data-table"
import { columns } from "../../../components/columns"
import { getCustomers } from "@/lib/actions/crm"
import { CustomerSheet } from "@/components/crm/customer-sheet"

export default async function CRMPage() {
    const result = await getCustomers()
    const customers = result.success ? result.data : []

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">إدارة العملاء</h1>
                    <p className="text-muted-foreground text-sm mt-2 opacity-80">إدارة قاعدة بيانات عملائك وتتبع نشاطهم وتفاعلهم بشكل احترافي</p>
                </div>
                <CustomerSheet />
            </div>
            <DataTable
                columns={columns}
                data={customers}
                searchPlaceholder="ابحث عن اسم العميل أو رقم الهاتف..."
            />
        </div>
    )
}
