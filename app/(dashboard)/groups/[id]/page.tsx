import { getGroup } from "@/lib/actions/groups"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowRight, UsersRound, Calendar, Tag, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { data: group, success } = await getGroup(resolvedParams.id)

    if (!success || !group) {
        notFound()
    }

    const { person } = group;

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
                        تفاصيل المجموعة ومعلومات المالك
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

                {/* Owner Premium Card */}
                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl text-card-foreground shadow-sm p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                    <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative mb-4">
                        <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm group-hover:bg-primary/30 transition-colors duration-500" />
                        <div className="relative size-16 rounded-full bg-background flex items-center justify-center border-2 border-primary/20 shadow-sm">
                            <User className="size-8 text-primary/80" />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-1 relative z-10 text-foreground group-hover:text-primary transition-colors">
                        {person ? person.name : "لا يوجد مالك"}
                    </h3>
                    
                    {person && (
                        <>
                            {person.personType ? (
                                <Badge variant="outline" className="mb-4 bg-background/50 backdrop-blur-md font-medium" style={{ borderColor: `${person.personType.color}40`, color: person.personType.color || undefined }}>
                                    {person.personType.name}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="mb-4 text-xs font-medium">
                                    {person.type || "صاحب المجموعة"}
                                </Badge>
                            )}

                            <div className="w-full h-px bg-border/40 my-2" />

                            <div className="w-full flex items-center gap-2 mt-2">
                                <Button variant="secondary" className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-0" asChild>
                                    <Link href={`/persons/${person.id}`}>
                                        عرض الملف الشخصي
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                    
                    {!person && (
                         <p className="text-sm font-medium text-muted-foreground relative z-10 mt-1">
                            يمكنك تعيين مالك لهذه المجموعة من صفحة التعديل
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
