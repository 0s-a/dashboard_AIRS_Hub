"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Phone, Mail } from "lucide-react"
import Link from "next/link"
import { ContactRecord } from "@/lib/person-types"

interface Person {
    id: string
    name: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contacts: any
    isActive: boolean
    createdAt: Date
}

interface RecentPersonsProps {
    persons: Person[]
}

function getPrimaryPhone(contacts: ContactRecord[] | null): string | null {
    if (!contacts || !Array.isArray(contacts)) return null
    const primary = contacts.find(c => c.type === 'phone' && c.isPrimary)
    if (primary) return primary.value
    const first = contacts.find(c => c.type === 'phone')
    return first?.value || null
}

function getPrimaryEmail(contacts: ContactRecord[] | null): string | null {
    if (!contacts || !Array.isArray(contacts)) return null
    const primary = contacts.find(c => c.type === 'email' && c.isPrimary)
    if (primary) return primary.value
    const first = contacts.find(c => c.type === 'email')
    return first?.value || null
}

export function RecentPersons({ persons }: RecentPersonsProps) {
    if (!persons || persons.length === 0) {
        return (
            <Card className="col-span-3 border-border/50 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        أحدث الأشخاص
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        لا يوجد أشخاص حتى الآن
                    </div>
                </CardContent>
            </Card>
        )
    }

    const validPersons = persons.filter(c => c && c.id);

    return (
        <Card className="col-span-3 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        أحدث الأشخاص
                    </CardTitle>
                    <Link
                        href="/persons"
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        عرض الكل ←
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {validPersons.slice(0, 5).map((person) => {
                        const phone = getPrimaryPhone(person.contacts)
                        const email = getPrimaryEmail(person.contacts)

                        return (
                            <div
                                key={person.id}
                                className="group flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all duration-200"
                            >
                                <div className="relative h-10 w-10 shrink-0 rounded-full bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {person.name ? person.name[0].toUpperCase() : "?"}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                            {person.name || "شخص جديد"}
                                        </p>
                                        {person.isActive && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                                نشط
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                        {phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" />
                                                <span className="font-mono" dir="ltr">{phone}</span>
                                            </div>
                                        )}
                                        {email && (
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="h-3 w-3" />
                                                <span className="truncate">{email}</span>
                                            </div>
                                        )}
                                        {!phone && !email && (
                                            <span className="text-muted-foreground/50">لا توجد بيانات اتصال</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
