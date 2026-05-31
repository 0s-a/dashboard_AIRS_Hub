import { notFound } from "next/navigation"
import Link from "next/link"
import { getWhatsappGroupById } from "@/lib/actions/whatsapp-groups"
import { getSupervisors } from "@/lib/actions/supervisors"
import { getCustomers } from "@/lib/actions/customers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    ArrowRight, MessageSquare, User, Users, Phone,
    ExternalLink, Hash, StickyNote, Calendar,
} from "lucide-react"
import { GroupDetailActions } from "./components/group-detail-actions"
import { GroupSupervisorManager } from "./components/group-supervisor-manager"
import { CopyButton, ContactLine } from "./components/group-detail-client"

export const dynamic = "force-dynamic"

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric", month: "long", day: "numeric",
    })
}

function getPrimaryContact(contacts: { type: string; value: string }[], type: "phone" | "whatsapp" | "email") {
    return contacts.find(c => c.type === type)?.value ?? null
}

export default async function WhatsappGroupDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const [groupRes, supervisorsRes, customersRes] = await Promise.all([
        getWhatsappGroupById(id),
        getSupervisors({ activeOnly: true, pageSize: 500 }),
        getCustomers({ pageSize: 500 }),
    ])

    if (!groupRes.success || !groupRes.data) notFound()

    const group = groupRes.data as any
    const allSupervisors = (supervisorsRes.success && supervisorsRes.data ? (supervisorsRes.data as any).supervisors : []) as any[]
    const allCustomers   = (customersRes.success && customersRes.data ? (customersRes.data as any).customers : []) as any[]

    const customerPhone   = getPrimaryContact(group.customer.contacts, "phone")
    const customerWa      = getPrimaryContact(group.customer.contacts, "whatsapp")
    const customerEmail   = getPrimaryContact(group.customer.contacts, "email")

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Breadcrumb + Header */}
            <div className="flex flex-col gap-4 border-b border-border/50 pb-6">
                <Link
                    href="/whatsapp-groups"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                    <ArrowRight className="size-4" />
                    مجموعات الواتساب
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            group.isActive ? "bg-emerald-500/10" : "bg-muted/60"
                        }`}>
                            <MessageSquare className={`size-6 ${group.isActive ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
                                <Badge className={group.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 border-0 text-xs"
                                    : "bg-muted text-muted-foreground border-0 text-xs"
                                }>
                                    {group.isActive ? "نشطة" : "معطّلة"}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {group.supervisors.length} مشرف · أُنشئت {formatDate(group.createdAt)}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <GroupDetailActions group={group} allCustomers={allCustomers} allSupervisors={allSupervisors} />
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* بطاقة معلومات المجموعة */}
                <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <MessageSquare className="size-4 text-emerald-600" />
                        معلومات المجموعة
                    </h2>

                    <div className="space-y-4">
                        {/* رقم الواتساب */}
                        {group.groupNumber && (
                            <InfoRow
                                icon={<Hash className="size-4 text-muted-foreground" />}
                                label="رقم المجموعة"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-muted-foreground" dir="ltr">
                                        {group.groupNumber}
                                    </span>
                                    <CopyButton value={group.groupNumber} />
                                </div>
                            </InfoRow>
                        )}

                        {/* تاريخ الإنشاء */}
                        <InfoRow
                            icon={<Calendar className="size-4 text-muted-foreground" />}
                            label="تاريخ الإنشاء"
                        >
                            <span className="text-sm text-muted-foreground">{formatDate(group.createdAt)}</span>
                        </InfoRow>

                        {/* آخر تعديل */}
                        <InfoRow
                            icon={<Calendar className="size-4 text-muted-foreground" />}
                            label="آخر تعديل"
                        >
                            <span className="text-sm text-muted-foreground">{formatDate(group.updatedAt)}</span>
                        </InfoRow>

                        {/* ملاحظات */}
                        {group.notes && (
                            <InfoRow
                                icon={<StickyNote className="size-4 text-muted-foreground" />}
                                label="ملاحظات"
                            >
                                <p className="text-sm text-muted-foreground leading-relaxed">{group.notes}</p>
                            </InfoRow>
                        )}
                    </div>
                </div>

                {/* بطاقة العميل */}
                <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <User className="size-4 text-blue-600" />
                        العميل
                    </h2>

                    <div className="flex items-start gap-4">
                        <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <User className="size-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                            <div>
                                <p className="font-bold text-lg">{group.customer.name ?? "—"}</p>
                            </div>

                            {/* جهات الاتصال */}
                            <div className="space-y-2">
                                {customerPhone && (
                                    <ContactLine icon="📞" value={customerPhone} href={`tel:${customerPhone}`} />
                                )}
                                {customerWa && (
                                    <ContactLine
                                        icon="💬"
                                        value={customerWa}
                                        href={`https://wa.me/${customerWa.replace(/\D/g, "").replace(/^0/, "966")}`}
                                        external
                                        label="واتساب"
                                    />
                                )}
                                {customerEmail && (
                                    <ContactLine icon="📧" value={customerEmail} href={`mailto:${customerEmail}`} />
                                )}
                                {!customerPhone && !customerWa && !customerEmail && (
                                    <p className="text-sm text-muted-foreground/60">لا توجد معلومات اتصال</p>
                                )}
                            </div>

                            <Link href={`/customers/${group.customerId}`}>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                    <ExternalLink className="size-3" />
                                    عرض ملف العميل
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* قسم المشرفين */}
            <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
                <GroupSupervisorManager
                    group={group}
                    allSupervisors={allSupervisors}
                />
            </div>
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────

function InfoRow({ icon, label, children }: {
    icon: React.ReactNode
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                {children}
            </div>
        </div>
    )
}
