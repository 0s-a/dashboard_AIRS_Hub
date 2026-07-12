export const dynamic = "force-dynamic"

import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { RecentProducts } from "@/components/dashboard/recent-products"
import { RecentCustomers } from "@/components/dashboard/recent-customers"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { toDisplayUrl } from "@/lib/utils/image-paths"
import { getCurrentUser } from "@/lib/actions/auth"

// Cache dashboard data for 60 seconds to improve performance
const getDashboardData = unstable_cache(
    async () => {
        // Optimize: Run all queries in parallel using Promise.all
        const [
            productCount,
            customerCount,
            activeCustomerCount,
            unavailableProductCount,
            recentProducts,
            recentCustomers
        ] = await Promise.all([
            prisma.product.count(),
            prisma.customer.count(),
            prisma.customer.count({ where: { isActive: true } }),
            prisma.product.count({
                where: { NOT: { skcs: { some: { isAvailable: true } } } },
            }),
            // Get recent products (last 5)
            prisma.product.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    skcs: {
                        include: {
                            images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 },
                            skus: {
                                include: {
                                    productPrices: {
                                        include: { priceLabel: true, currency: true },
                                        orderBy: { createdAt: 'asc' },
                                        take: 1,
                                    },
                                },
                                take: 1,
                            },
                        },
                        orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
                        take: 1,
                    },
                },
            }),
            // Get recent customers (last 5) - with customerType and contacts
            prisma.customer.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    contacts: { select: { id: true, type: true, value: true, isPrimary: true } },
                    isActive: true,
                    createdAt: true,
                }
            })
        ])

        // Generate activity data for last 7 days (optimized with parallel execution)
        const activityData = await generateActivityData()

        return {
            stats: {
                productCount,
                customerCount,
                activeCustomerCount,
                unavailableProductCount
            },
            recentProducts: recentProducts.map((p: any) => {
                const primarySkc = (p.skcs || []).find((s: any) => s.isDefault) || p.skcs?.[0]
                return {
                ...p,
                isAvailable: (p.skcs || []).some((skc: { isAvailable?: boolean }) => skc.isAvailable),
                mediaImages: (primarySkc?.images || []).map((pi: any) => ({
                    url: toDisplayUrl(pi.url),
                    isPrimary: pi.isPrimary,
                })),
                productPrices: (primarySkc?.skus || []).flatMap((sku: any) =>
                    (sku.productPrices || []).map((pp: any) => ({
                        priceLabelName: pp.priceLabel.name,
                        value: Number(pp.value),
                        currencySymbol: pp.currency.symbol,
                    }))
                ).slice(0, 1),
            }}),
            recentCustomers,
            activityData
        }
    },
    ['dashboard-data'],
    {
        revalidate: 60, // Cache for 60 seconds
        tags: ['dashboard']
    }
)

async function generateActivityData() {
    const days = 7
    // Create an array of the last 7 days date ranges
    const dateRanges = Array.from({ length: days }).map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        date.setHours(0, 0, 0, 0)
        
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        
        return { date, nextDate }
    })

    // Execute all count queries in parallel
    const results = await Promise.all(
        dateRanges.map(async ({ date, nextDate }) => {
            const [products, customers] = await Promise.all([
                prisma.product.count({
                    where: { createdAt: { gte: date, lt: nextDate } }
                }),
                prisma.customer.count({
                    where: { createdAt: { gte: date, lt: nextDate } }
                })
            ])
            return {
                date: date.toLocaleDateString('ar-YE', { month: 'short', day: 'numeric' }),
                products,
                customers
            }
        })
    )

    return results
}

export default async function DashboardPage() {
    // Fetch user and dashboard data in parallel
    const [userRes, dashboardData] = await Promise.all([
        getCurrentUser(),
        getDashboardData()
    ])
    
    const userName = userRes.success && userRes.data ? userRes.data.name : ""
    const { stats, recentProducts, recentCustomers, activityData } = dashboardData

    const statCardsData = [
        { title: "عدد المنتجات", value: stats.productCount, iconName: "package" as const, desc: "منتج متوفر في المخزون", color: "indigo" as const },
        { title: "إجمالي العملاء", value: stats.customerCount, iconName: "users" as const, desc: "عميل مسجل حالياً", color: "blue" as const },
        { title: "العملاء النشطون", value: stats.activeCustomerCount, iconName: "trending-up" as const, desc: "عميل نشط", color: "green" as const },
        { title: "منتجات غير متوفرة", value: stats.unavailableProductCount, iconName: "alert-circle" as const, desc: "منتج غير متاح حالياً", color: "orange" as const },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <WelcomeSection userName={userName} />

            {/* Stats Cards */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {statCardsData.map((card, idx) => (
                    <div 
                        key={idx} 
                        className="animate-in fade-in slide-in-from-bottom-4 duration-500" 
                        style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                    >
                        <StatCard
                            title={card.title}
                            value={card.value}
                            iconName={card.iconName}
                            description={card.desc}
                            colorScheme={card.color}
                        />
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-7">
                    <div className="lg:col-span-7">
                        <ActivityChart data={activityData} />
                    </div>
                </div>
            </div>

            {/* Recent Items */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
                    <RecentProducts products={recentProducts as any} />
                    <RecentCustomers customers={recentCustomers as any} />
                </div>
            </div>
        </div>
    )
}
