import { OrderSheet } from "@/components/orders/order-sheet"
import { OrdersTable } from "@/components/orders/orders-table"
import { getOrders } from "@/lib/actions/orders"
import { getPersons } from "@/lib/actions/persons"
import { prisma } from "@/lib/prisma"
import { ShoppingCart, Clock, CheckCircle2, XCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
    const [ordersRes, personsRes, products] = await Promise.all([
        getOrders(),
        getPersons(),
        prisma.product.findMany({
            select: { id: true, name: true, itemNumber: true },
            orderBy: { name: "asc" },
        }),
    ])

    const orders = (ordersRes.success ? ordersRes.data : []) as any[]
    const persons = (personsRes.success ? personsRes.data : []) as any[]

    // ── Stats ──
    const total = orders.length
    const pending = orders.filter(o => o.status === "pending").length
    const delivered = orders.filter(o => o.status === "delivered").length
    const cancelled = orders.filter(o => o.status === "cancelled").length

    const stats = [
        { label: "إجمالي الطلبات", value: total, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-500/10" },
        { label: "معلقة", value: pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-500/10" },
        { label: "مسلّمة", value: delivered, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
        { label: "ملغاة", value: cancelled, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10" },
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
                    <OrderSheet persons={persons} products={products} />
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Table */}
            <main className="rounded-2xl border bg-card shadow-sm overflow-hidden p-1">
                <OrdersTable orders={orders} persons={persons} products={products} />
            </main>
        </div>
    )
}
