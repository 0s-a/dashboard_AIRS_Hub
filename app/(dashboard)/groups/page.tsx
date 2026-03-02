import { getGroups } from "@/lib/actions/groups"
import { GroupTable } from "@/components/groups/group-table"
import { GroupSheet } from "@/components/groups/group-sheet"
import { UsersRound, Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
    const { data: groups, success, error } = await getGroups()

    if (!success) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>حدث خطأ أثناء تحميل البيانات</p>
                <p className="text-sm mt-2">{error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent inline-block">
                        المجموعات
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        إدارة وتصنيف مجموعات الأشخاص
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <GroupSheet />
                </div>
            </div>

            {/* Header section with stats look but simple */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex items-center p-6 gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <UsersRound className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">إجمالي المجموعات</p>
                        <h3 className="text-2xl font-bold">{groups?.length || 0}</h3>
                    </div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex items-center p-6 gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">وسوم المجموعات</p>
                        <h3 className="text-2xl font-bold">
                            {Array.from(new Set(groups?.flatMap((g: any) => (g.tags as string[]) || []))).length}
                        </h3>
                    </div>
                </div>
            </div>

            <main className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="p-1">
                    <GroupTable data={groups || []} />
                </div>
            </main>
        </div>
    )
}
