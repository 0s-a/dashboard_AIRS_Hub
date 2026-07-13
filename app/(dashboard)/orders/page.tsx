import { OrderSheet } from "@/components/orders/order-sheet"
import { OrdersTable } from "@/components/orders/orders-table"
import { getOrders, getOrderStats } from "@/lib/actions/orders"
import { getCustomers } from "@/lib/actions/customers"
import { getDefaultCurrency } from "@/lib/actions/currencies"
import { prisma } from "@/lib/prisma"
import { ShoppingCart, Clock, CheckCircle2, XCircle, Package, Truck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
    const [ordersRes, statsRes, customersRes, products, defaultCurrencyRes] = await Promise.all([
        getOrders({ page: 1, limit: 100 }),
        getOrderStats(),
        getCustomers(),
        prisma.product.findMany({
            select: {
                id: true,
                name: true,
                itemNumber: true,
                productUnits: {
                    include: { unit: { select: { id: true, name: true, pluralName: true } } },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { name: "asc" },
        }),
        getDefaultCurrency(),
    ])

    // Serialize to remove Decimal objects before passing to Client Components
    const orders = JSON.parse(JSON.stringify(
        ordersRes.success ? ordersRes.data.data : []
    ))
    const customers = JSON.parse(JSON.stringify(
        customersRes.success ? customersRes.data.customers : []
    ))
    const defaultSymbol = defaultCurrencyRes.success ? (defaultCurrencyRes.data?.symbol ?? "") : ""

    // ── Stats — computed at database level ──
    const s = statsRes.success ? statsRes.data : { total: 0, pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }

    const stats = [
        { label: "إجمالي الطلبات", value: s.total,      icon: ShoppingCart, color: "text-blue-600",    bg: "bg-blue-500/10" },
        { label: "معلقة",          value: s.pending,     icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-500/10" },
        { label: "قيد التجهيز",   value: s.processing,  icon: Package,      color: "text-violet-600", bg: "bg-violet-500/10" },
        { label: "تم الشحن",      value: s.shipped,     icon: Truck,        color: "text-indigo-600", bg: "bg-indigo-500/10" },
        { label: "مسلّمة",        value: s.delivered,   icon: CheckCircle2, color: "text-emerald-600",bg: "bg-emerald-500/10" },
        { label: "ملغاة",         value: s.cancelled,   icon: XCircle,      color: "text-red-600",    bg: "bg-red-500/10" },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">
                        إدارة الطلبات
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إنشاء وتتبع طلبات العملاء بشكل متكامل
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <OrderSheet customers={customers} products={products} defaultSymbol={defaultSymbol} />
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border bg-card p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-primary/20 group"
                    >
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <h3 className="text-2xl font-bold font-mono tracking-tight">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <main className="rounded-2xl border bg-card shadow-sm overflow-hidden p-1">
                <OrdersTable orders={orders} customers={customers} products={products} defaultSymbol={defaultSymbol} />
            </main>
        </div>
    )
}
