import { getArchivedPersons } from "@/lib/actions/persons"
import { togglePersonActive, hardDeletePerson } from "@/lib/actions/persons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MessageCircle, ArchiveRestore, Trash2 } from "lucide-react"
import Link from "next/link"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

const contactIcons: Record<string, any> = { phone: Phone, email: Mail, whatsapp: MessageCircle }

export default async function ArchivedPersonsPage() {
    const result = await getArchivedPersons()
    const persons = (result.success ? result.data : []) as any[]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">
                        الأشخاص المؤرشفون
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {persons.length} شخص في الأرشيف — يمكن استعادتهم أو حذفهم نهائياً
                    </p>
                </div>
                <Link href="/persons">
                    <Button variant="outline" className="rounded-xl gap-2">
                        العودة للقائمة
                    </Button>
                </Link>
            </div>

            {persons.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    <ArchiveRestore className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>لا يوجد أشخاص في الأرشيف</p>
                </div>
            ) : (
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden divide-y divide-border/50">
                    {persons.map((person: any) => {
                        const primary = person.contacts?.find((c: any) => c.isPrimary) ?? person.contacts?.[0]
                        const Icon = primary ? contactIcons[primary.type] ?? Phone : Phone

                        return (
                            <div key={person.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                                        {person.name?.[0] ?? "؟"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{person.name ?? "بدون اسم"}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {primary && (
                                                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                    <Icon className="h-3 w-3" />{primary.value}
                                                </span>
                                            )}

                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <form action={async () => {
                                        "use server"
                                        await togglePersonActive(person.id, true)
                                        revalidatePath("/persons/archived")
                                        revalidatePath("/persons")
                                    }}>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                        >
                                            <ArchiveRestore className="h-3.5 w-3.5" />
                                            استعادة
                                        </button>
                                    </form>
                                    <form action={async () => {
                                        "use server"
                                        await hardDeletePerson(person.id)
                                        revalidatePath("/persons/archived")
                                    }}>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            حذف نهائي
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
