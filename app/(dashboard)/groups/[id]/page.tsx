import { getGroup, togglePersonInGroup } from "@/lib/actions/groups"
import { getPersons } from "@/lib/actions/persons"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowRight, UsersRound, Calendar, Tag, Plus, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GroupPersonsDialog } from "@/components/groups/group-persons-dialog"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "@/components/columns" // Re-using Person columns

export const dynamic = "force-dynamic"

export default async function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { data: group, success } = await getGroup(resolvedParams.id)
    const { data: allPersons } = await getPersons()

    if (!success || !group) {
        notFound()
    }

    const groupPersonsIds = group.persons.map((p: any) => p.id)

    // Logic moved to group-persons-dialog component

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 rounded-full">
                    <Link href="/groups">
                        <ArrowRight className="h-4 w-4" />
                        <span className="sr-only">عودة</span>
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
                        {group.name}
                        <Badge variant="outline" className="font-mono text-sm border-primary/20 bg-primary/5 text-primary">
                            {group.number}
                        </Badge>
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        تفاصيل المجموعة والأشخاص المنتمين إليها
                    </p>
                </div>
            </div>

            {/* Group Stats Card */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 col-span-2">
                    <div className="flex gap-4 items-start">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <UsersRound className="size-6 text-primary" />
                        </div>
                        <div className="space-y-4 flex-1">
                            <div>
                                <h3 className="font-semibold text-lg">{group.name}</h3>
                                <p className="text-sm text-muted-foreground">معلومات أساسية عن المجموعة</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Tag className="size-4" />
                                        <span>وسوم المجموعة</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {((group.tags as string[]) || []).length > 0 ? (
                                            ((group.tags as string[]) || []).map((tag, i) => (
                                                <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                                                    {tag}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm italic text-muted-foreground">لا توجد وسوم</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="size-4" />
                                        <span>تاريخ الإنشاء</span>
                                    </div>
                                    <p className="font-medium text-sm pt-1">
                                        {new Date(group.createdAt).toLocaleDateString("ar-SA", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric"
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-primary text-primary-foreground shadow-sm p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/10 transition-opacity" />
                    <UsersRound className="size-10 mb-4 opacity-80" />
                    <h3 className="text-4xl font-bold mb-1 relative z-10">{group.persons.length}</h3>
                    <p className="text-sm font-medium opacity-80 relative z-10">شخص في هذه المجموعة</p>
                </div>
            </div>

            {/* Persons Table Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold">الأشخاص في المجموعة</h3>
                    </div>

                    <GroupPersonsDialog
                        groupId={group.id}
                        allPersons={(allPersons as any) || []}
                        groupPersonsIds={groupPersonsIds}
                    />
                </div>

                <main className="rounded-xl border bg-card shadow-sm overflow-hidden p-1">
                    <DataTable
                        columns={columns as any}
                        data={group.persons as any}
                        searchPlaceholder="ابحث في أعضاء المجموعة..."
                    />
                </main>
            </div>
        </div>
    )
}
