import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Phone, Mail, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"
import { ContactRecord } from "@/lib/customer-types"

interface Customer {
    id: string
    name: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contacts: any

    isActive: boolean
    createdAt: Date
}

interface RecentCustomersProps {
    customers: Customer[]
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

// Generate a consistent color from customer name
function getAvatarColor(name: string | null): string {
    if (!name) return '#6366f1'
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

export function RecentCustomers({ customers }: RecentCustomersProps) {
    if (!customers || customers.length === 0) {
        return (
            <Card className="col-span-3 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-base font-bold">أحدث العملاء</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Users className="size-10 text-muted-foreground/20" />
                        <span className="text-sm font-medium">لا يوجد عملاء حتى الآن</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const validCustomers = customers.filter(c => c && c.id);

    return (
        <Card className="col-span-3 border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-base font-bold">أحدث العملاء</span>
                    </CardTitle>
                    <Link
                        href="/customers"
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold group transition-colors"
                    >
                        عرض الكل
                        <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    {validCustomers.slice(0, 5).map((customer) => {
                        const phone = getPrimaryPhone(customer.contacts)
                        const email = getPrimaryEmail(customer.contacts)
                        const avatarColor = getAvatarColor(customer.name)

                        return (
                            <div
                                key={customer.id}
                                className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all duration-300"
                            >
                                {/* Avatar */}
                                <div
                                    className="relative h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm transition-transform duration-300"
                                    style={{ backgroundColor: avatarColor }}
                                >
                                    {customer.name ? customer.name[0].toUpperCase() : "?"}
                                    {customer.isActive && (
                                        <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-300">
                                            {customer.name || "عميل جديد"}
                                        </p>
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
                                                <span className="font-medium">{timeAgo(customer.createdAt)}</span>
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
