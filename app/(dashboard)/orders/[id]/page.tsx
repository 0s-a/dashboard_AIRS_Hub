import { notFound } from "next/navigation"
import Link from "next/link"
import { getOrderById } from "@/lib/actions/orders"
import { getCustomers } from "@/lib/actions/customers"
import { getDefaultCurrency } from "@/lib/actions/currencies"
import { prisma } from "@/lib/prisma"
import { OrderSheet } from "@/components/orders/order-sheet"
import { OrderStatusUpdater } from "@/components/orders/order-status-updater"
import { resolveItemPrice, calcOrderTotal } from "@/lib/order-utils"
import { ORDER_STATUS_CONFIG, type OrderStatusValue } from "@/lib/order-constants"
import {
    ArrowRight, ArrowLeft,
    ShoppingCart, User, StickyNote,
    Package, Calendar, Hash, Coins, Truck,
} from "lucide-react"
interface Props {
    params: Promise<{ id: string }>
}
export default async function OrderDetailPage({ params }: Props) {
    const { id } = await params
    const [orderRes, customersRes, products, defaultCurrencyRes] = await Promise.all([
        getOrderById(id),
        getCustomers(),
        prisma.item.findMany({
            select: {
                id: true,
                name: true,
                itemNumber: true,
                itemUnits: {
                    include: { unit: { select: { id: true, name: true, pluralName: true } } },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { name: "asc" },
        }),
        getDefaultCurrency(),
    ])
    if (!orderRes.success || !orderRes.data) return notFound()
    // Serialize to remove Decimal / Date objects before passing to Client Components
    const order = JSON.parse(JSON.stringify(orderRes.data)) as any
    const customers = JSON.parse(JSON.stringify(
        customersRes.success ? customersRes.data.customers : []
    )) as any[]
    const defaultSymbol    = defaultCurrencyRes.success ? (defaultCurrencyRes.data?.symbol ?? "") : ""
    const customerPLId     = order.customer?.priceLabelId ?? null
    const totalAmount      = calcOrderTotal(order.items ?? [], customerPLId)
    const itemsCount       = order.items?.length ?? 0
    const totalQty         = (order.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 0), 0)
    const currencySymbol   = defaultSymbol
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/orders" className="hover:text-foreground transition-colors flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    الطلبات
                </Link>
                <span className="text-border">/</span>
                <span className="text-foreground font-mono font-bold">#{order.orderNumber}</span>
            </div>
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight font-mono">
                                #{order.orderNumber}
                            </h1>
                            <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {new Date(order.createdAt).toLocaleDateString("ar-SA", {
                                year: "numeric", month: "long", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Link
                        href="/orders"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        رجوع
                    </Link>
                    <OrderSheet
                        mode="edit"
                        order={order}
                        customers={customers}
                        products={products}
                        defaultSymbol={defaultSymbol}
                        trigger={
                            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium">
                                تعديل الطلب
                            </button>
                        }
                    />
                </div>
            </div>
            {/* ── Stats ── */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    {
                        label: "الإجمالي",
                        value: `${totalAmount.toLocaleString("ar-YE")} ${currencySymbol}`,
                        icon: Coins,
                        color: "text-emerald-600",
                        bg: "bg-emerald-500/10",
                    },
                    {
                        label: "عدد الأصناف",
                        value: itemsCount,
                        icon: Package,
                        color: "text-blue-600",
                        bg: "bg-blue-500/10",
                    },
                    {
                        label: "إجمالي الكمية",
                        value: totalQty,
                        icon: Hash,
                        color: "text-violet-600",
                        bg: "bg-violet-500/10",
                    },
                    {
                        label: "تاريخ الطلب",
                        value: new Date(order.createdAt).toLocaleDateString("ar-SA"),
                        icon: Calendar,
                        color: "text-amber-600",
                        bg: "bg-amber-500/10",
                    },
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
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                {/* ── Customer Info ── */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" /> معلومات العميل
                    </h2>
                    {order.customer ? (
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                                {order.customer.name?.[0] ?? "؟"}
                            </div>
                            <div>
                                <Link
                                    href={`/customers/${order.customer.id}`}
                                    className="font-semibold text-sm hover:text-primary hover:underline underline-offset-2 transition-colors"
                                >
                                    {order.customer.name}
                                </Link>
                                <p className="text-xs text-muted-foreground mt-0.5">عرض الملف الشخصي ←</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">لا يوجد عميل مرتبط</p>
                    )}
                </div>
                {/* ── Notes ── */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <StickyNote className="h-4 w-4 text-primary" /> الملاحظات
                    </h2>
                    {order.notes ? (
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {order.notes}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">لا توجد ملاحظات</p>
                    )}
                </div>
                {/* ── Delivery Info ── */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-primary" /> معلومات التوصيل
                    </h2>
                    {order.deliveryInfo ? (
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {order.deliveryInfo}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">لا توجد معلومات توصيل</p>
                    )}
                </div>
                {/* ── Status Updater ── */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-primary" /> تحديث الحالة
                    </h2>
                    <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
                </div>
            </div>
            {/* ── Items Table ── */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border/50 flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-primary" />
                        أصناف الطلب
                    </h2>
                    <span className="text-xs text-muted-foreground">{itemsCount} صنف · {totalQty} قطعة</span>
                </div>
                {/* Header row */}
                <div className="grid grid-cols-[1fr_80px_100px_100px_120px] gap-4 px-5 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground border-b border-border/30">
                    <span>الصنف</span>
                    <span className="text-center">المواصفة</span>
                    <span className="text-center">الكمية</span>
                    <span className="text-center">سعر الوحدة</span>
                    <span className="text-end">الإجمالي</span>
                </div>
                <div className="divide-y divide-border/40">
                    {(order.items ?? []).map((item: any, i: number) => {
                        const { price, symbol, priceLabelName } = resolveItemPrice(item, customerPLId)
                        const lineTotal = price * (item.quantity ?? 0)
                        const sym = symbol || defaultSymbol
                        const line = item.item ?? item.product
                        const attrs = line?.itemAttributes ?? line?.productAttributes ?? []
                        return (
                            <div
                                key={i}
                                className="grid grid-cols-[1fr_80px_100px_100px_120px] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors"
                            >
                                {/* Item */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{line?.name ?? "—"}</p>
                                        {priceLabelName && priceLabelName !== '—' && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{priceLabelName}</p>
                                        )}
                                        {item.notes && (
                                            <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{item.notes}</p>
                                        )}
                                    </div>
                                </div>
                                {/* Attributes */}
                                <div className="flex items-center justify-center gap-1.5">
                                    {attrs.length ? (
                                        <span className="text-xs text-muted-foreground truncate max-w-[90px]" title={
                                            attrs.map((a: { value: string }) => a.value).join(' · ')
                                        }>
                                            {attrs.map((a: { value: string }) => a.value).filter(Boolean).join(' / ')
                                                || line?.itemNumber
                                                || '—'}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">
                                            {line?.itemNumber || '—'}
                                        </span>
                                    )}
                                </div>
                                {/* Quantity */}
                                <div className="text-center">
                                    <span className="text-sm font-semibold">{item.quantity}</span>
                                </div>
                                {/* Unit Price */}
                                <div className="text-center">
                                    <span className="text-sm font-mono">
                                        {price.toLocaleString("ar-YE")} {sym}
                                    </span>
                                </div>
                                {/* Line Total */}
                                <div className="text-end">
                                    <span className="text-sm font-mono font-semibold text-primary">
                                        {lineTotal.toLocaleString("ar-YE")} {sym}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* Footer Total */}
                <div className="px-5 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
                    <span className="text-sm font-semibold text-muted-foreground">الإجمالي الكلي</span>
                    <span className="text-lg font-bold font-mono text-primary">
                        {totalAmount.toLocaleString("ar-YE")} {currencySymbol}
                    </span>
                </div>
            </div>
        </div>
    )
}
// ── Inline StatusBadge (server-safe, no "use client") ────────────────────────
function OrderStatusBadge({ status }: { status: string }) {
    const cfg = ORDER_STATUS_CONFIG[status as OrderStatusValue]
        ?? { label: status, color: 'bg-muted text-muted-foreground border-border' }
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
            {cfg.label}
        </span>
    )
}
