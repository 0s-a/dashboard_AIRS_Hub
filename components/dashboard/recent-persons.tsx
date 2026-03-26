"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Phone, Mail, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"
import { ContactRecord } from "@/lib/person-types"

interface Person {
    id: string
    name: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contacts: any
    personType?: { id: string; name: string; color: string | null; icon: string | null } | null
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

function timeAgo(date: Date | string) {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return "الآن"
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
    return `منذ ${Math.floor(diff / 86400)} ي`
}

// Generate a consistent color from person name
function getAvatarColor(name: string | null): string {
    if (!name) return '#6366f1'
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

export function RecentPersons({ persons }: RecentPersonsProps) {
    if (!persons || persons.length === 0) {
        return (
            <Card className="col-span-3 border border-border/40 bg-card/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-teal-500" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/8">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        أحدث الأشخاص
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Users className="size-10 text-muted-foreground/20" />
                        <span className="text-sm font-medium">لا يوجد أشخاص حتى الآن</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const validPersons = persons.filter(c => c && c.id);

    return (
        <Card className="col-span-3 border border-border/40 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 w-full bg-linear-to-r from-emerald-500 to-teal-500" />

            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/8">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-base font-bold">أحدث الأشخاص</span>
                    </CardTitle>
                    <Link
                        href="/persons"
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold group transition-colors"
                    >
                        عرض الكل
                        <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {validPersons.slice(0, 5).map((person) => {
                        const phone = getPrimaryPhone(person.contacts)
                        const email = getPrimaryEmail(person.contacts)
                        const avatarColor = getAvatarColor(person.name)

                        return (
                            <div
                                key={person.id}
                                className="group flex items-center gap-4 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-primary/15 transition-all duration-300"
                            >
                                {/* Avatar */}
                                <div
                                    className="relative h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-105 transition-transform duration-300"
                                    style={{ backgroundColor: avatarColor }}
                                >
                                    {person.name ? person.name[0].toUpperCase() : "?"}
                                    {person.isActive && (
                                        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-300">
                                            {person.name || "شخص جديد"}
                                        </p>
                                        {person.personType && (
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] px-1.5 py-0 h-[18px] font-bold border-current/20"
                                                style={{
                                                    color: person.personType.color || undefined,
                                                    backgroundColor: person.personType.color ? `${person.personType.color}15` : undefined,
                                                }}
                                            >
                                                {person.personType.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                        {phone && (
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-muted-foreground/50" />
                                                <span className="font-mono font-medium" dir="ltr">{phone}</span>
                                            </div>
                                        )}
                                        {email && (
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-3 w-3 text-muted-foreground/50" />
                                                <span className="truncate max-w-[120px] font-medium">{email}</span>
                                            </div>
                                        )}
                                        {!phone && !email && (
                                            <div className="flex items-center gap-1 text-muted-foreground/40">
                                                <Clock className="h-3 w-3" />
                                                <span className="font-medium">{timeAgo(person.createdAt)}</span>
                                            </div>
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
