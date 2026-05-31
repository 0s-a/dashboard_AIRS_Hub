import { notFound } from "next/navigation"
import { getCustomerById } from "@/lib/actions/customers"
import { Badge } from "@/components/ui/badge"
import { CustomerSheet } from "@/components/customers/customer-sheet"
import {
    Phone, Mail, MessageCircle,
    Tag, Users, ShoppingCart, ArrowRight, Calendar,
    Wallet, Coins, CircleCheck, CircleX,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface CustomerPageProps {
    params: Promise<{ id: string }>
}

const contactIcons: Record<string, any> = {
    phone: Phone,
    email: Mail,
    whatsapp: MessageCircle,
}

const statusLabels: Record<string, { label: string; className: string }> = {
    pending:    { label: "قيد الانتظار",  className: "bg-amber-500/10 text-amber-600" },
    confirmed:  { label: "مؤكّد",         className: "bg-blue-500/10 text-blue-600" },
    processing: { label: "قيد التجهيز",   className: "bg-violet-500/10 text-violet-600" },
    shipped:    { label: "تم الشحن",       className: "bg-cyan-500/10 text-cyan-600" },
    delivered:  { label: "تم التسليم",    className: "bg-emerald-500/10 text-emerald-600" },
    cancelled:  { label: "ملغى",           className: "bg-red-500/10 text-red-600" },
}

export default async function CustomerProfilePage({ params }: CustomerPageProps) {
    const { id } = await params
    const result = await getCustomerById(id)
    if (!result.success || !result.data) return notFound()
    const customer = result.data as any

    const totalOrders = customer.orders?.length ?? 0
    const totalAmount = (customer.orders ?? []).reduce((sum: number, o: any) => sum + (parseFloat(o.totalAmount) || 0), 0)
    const primaryPhone = customer.contacts?.find((c: any) => c.type === "phone" && c.isPrimary) ?? customer.contacts?.[0]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/customers" className="hover:text-foreground transition-colors">العملاء</Link>
                <ArrowRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{customer.name ?? "بدون اسم"}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {customer.name?.[0] ?? "؟"}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight">{customer.name ?? "بدون اسم"}</h1>
                            <Badge className={customer.isActive ? "bg-emerald-500/10 text-emerald-600 border-0" : "bg-muted text-muted-foreground border-0"}>
                                {customer.isActive ? <><CircleCheck className="h-3 w-3 ml-1" />نشط</> : <><CircleX className="h-3 w-3 ml-1" />غير نشط</>}
                            </Badge>
                        </div>
                        {primaryPhone && (
                            <p className="text-sm text-muted-foreground mt-1 font-mono" dir="ltr">{primaryPhone.value}</p>
                        )}
                    </div>
                </div>
                <CustomerSheet customer={customer} trigger={
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium">
                        تعديل البيانات
                    </button>
                } />
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                {[
                    { label: "إجمالي الطلبات", value: totalOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-500/10" },
                    { label: "إجمالي المشتريات", value: `${totalAmount.toLocaleString("ar")} ر.ي`, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                    { label: "تاريخ الانضمام", value: new Date(customer.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long" }), icon: Calendar, color: "text-violet-600", bg: "bg-violet-500/10" },
                ].map((stat, i) => (
                    <div key={i} className="rounded-2xl border bg-card p-5 flex items-center gap-4 shadow-sm">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Contact info */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" /> معلومات الاتصال
                    </h2>
                    {customer.contacts?.length > 0 ? customer.contacts.map((c: any) => {
                        const Icon = contactIcons[c.type] ?? Phone
                        return (
                            <div key={c.id} className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-mono text-sm" dir="ltr">{c.value}</p>
                                    {c.label && <p className="text-xs text-muted-foreground">{c.label}</p>}
                                </div>
                                {c.isPrimary && <Badge className="text-[10px] bg-primary/10 text-primary border-0 mr-auto">أساسي</Badge>}
                            </div>
                        )
                    }) : <p className="text-sm text-muted-foreground">لا توجد بيانات اتصال</p>}
                </div>

                {/* Details */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <Tag className="h-4 w-4 text-primary" /> تفاصيل إضافية
                    </h2>
                    {customer.source && (
                        <div className="flex gap-2">
                            <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-sm">المصدر: {customer.source}</p>
                        </div>
                    )}
                    {customer.tags?.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            {customer.tags.map((pt: any) => {
                                const name = pt.tag?.name ?? pt
                                return (
                                    <Badge key={name} className="bg-muted text-muted-foreground border-0 text-xs">{name}</Badge>
                                )
                            })}
                        </div>
                    )}
                    {customer.priceLabel && (
                        <div className="flex gap-2 flex-wrap">
                            <Wallet className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <Badge className="bg-indigo-500/10 text-indigo-700 border-0 text-xs">{customer.priceLabel.name}</Badge>
                            {customer.priceLabel.customerType && (
                                <span className="text-xs text-muted-foreground self-center">{customer.priceLabel.customerType}</span>
                            )}
                        </div>
                    )}
                </div>


            </div>

            {/* Orders */}
            {customer.orders?.length > 0 && (
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-border/50 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <h2 className="font-semibold text-sm">آخر الطلبات</h2>
                    </div>
                    <div className="divide-y divide-border/50">
                        {customer.orders.map((order: any) => {
                            const status = statusLabels[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground" }
                            return (
                                <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-bold text-muted-foreground">#{order.orderNumber}</span>
                                        <Badge className={`border-0 text-xs ${status.className}`}>{status.label}</Badge>
                                        <span className="text-xs text-muted-foreground">{order.items?.length ?? 0} منتج</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {order.totalAmount && (
                                            <span className="font-semibold text-sm">{parseFloat(order.totalAmount).toLocaleString("ar")}</span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
