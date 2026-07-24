import { Sparkles } from "lucide-react"
import { getItemsForNewTags } from "@/lib/actions/items"
import { NewTagsTable } from "./new-tags-table"

export const dynamic = "force-dynamic"

export default async function NewTagsPage() {
    const res = await getItemsForNewTags({ page: 1, limit: 50 })

    const totalNew = await (async () => {
        const newRes = await getItemsForNewTags({ filterNew: true, limit: 1 })
        return newRes.pagination.total
    })()

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-l from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-1.5 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-500/80 to-teal-600 shadow-md shadow-emerald-500/20 text-white">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                            الأصناف{" "}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">
                                الجديدة
                            </span>
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-lg pr-1">
                        حدّد الأصناف التي تريد تمييزها كأصناف جديدة عن طريق تحديد المربع بجانبها. ستُضاف إليها علامة <span className="font-bold text-emerald-600">new</span> تلقائياً.
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 shrink-0">
                    <div className="text-center px-5 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-sm">
                        <p className="text-2xl font-black text-emerald-600">{totalNew.toLocaleString('ar-EG')}</p>
                        <p className="text-xs text-emerald-700/70 font-medium mt-0.5">صنف جديد</p>
                    </div>
                    <div className="text-center px-5 py-3 rounded-xl border border-border/50 bg-background shadow-sm">
                        <p className="text-2xl font-black text-foreground">{res.pagination.total.toLocaleString('ar-EG')}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">إجمالي الأصناف</p>
                    </div>
                </div>
            </div>

            <NewTagsTable
                initialItems={res.data}
                initialPagination={res.pagination}
            />
        </div>
    )
}
