import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { RecentProducts } from "@/components/dashboard/recent-products"
import { RecentPersons } from "@/components/dashboard/recent-persons"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

// Cache dashboard data for 60 seconds to improve performance
const getDashboardData = unstable_cache(
    async () => {
        // Optimize: Run all queries in parallel using Promise.all
        const [
            productCount,
            personCount,
            activePersonCount,
            unavailableProductCount,
            recentProducts,
            recentPersons
        ] = await Promise.all([
            prisma.product.count(),
            prisma.person.count(),
            prisma.person.count({ where: { isActive: true } }),
            prisma.product.count({ where: { isAvailable: false } }),
            // Get recent products (last 5)
            prisma.product.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    productImages: { include: { mediaImage: true } },
                    productPrices: {
                        include: { priceLabel: true, currency: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            }),
            // Get recent persons (last 5) - with personType and contacts
            prisma.person.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    contacts: { select: { id: true, type: true, value: true, isPrimary: true } },
                    personType: { select: { id: true, name: true, color: true, icon: true } },
                    isActive: true,
                    createdAt: true,
                }
            })
        ])


        // Generate activity data for last 7 days (optimized)
        const activityData = await generateActivityData()

        return {
            stats: {
                productCount,
                personCount,
                activePersonCount,
                unavailableProductCount
            },
            recentProducts: recentProducts.map((p: any) => ({
                ...p,
                mediaImages: (p.productImages || []).map((pi: any) => ({
                    url: pi.mediaImage.url,
                    isPrimary: pi.isPrimary,
                })),
                productPrices: (p.productPrices || []).map((pp: any) => ({
                    priceLabelName: pp.priceLabel.name,
                    value: pp.value,
                    currencySymbol: pp.currency.symbol,
                })),
            })),
            recentPersons,
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
    const data = []

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const productsCount = await prisma.product.count({
            where: {
                createdAt: {
                    gte: date,
                    lt: nextDate
                }
            }
        })

        const personsCount = await prisma.person.count({
            where: {
                createdAt: {
                    gte: date,
                    lt: nextDate
                }
            }
        })

        data.push({
            date: date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
            products: productsCount,
            persons: personsCount
        })
    }

    return data
}

export default async function DashboardPage() {
    const { stats, recentProducts, recentPersons, activityData } = await getDashboardData()

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <WelcomeSection />

            {/* Stats Cards */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
                    <StatCard
                        title="عدد المنتجات"
                        value={stats.productCount}
                        iconName="package"
                        description="منتج متوفر في المخزون"
                        colorScheme="indigo"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                    <StatCard
                        title="إجمالي الأشخاص"
                        value={stats.personCount}
                        iconName="users"
                        description="شخص مسجل حالياً"
                        colorScheme="blue"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                    <StatCard
                        title="الأشخاص النشطون"
                        value={stats.activePersonCount}
                        iconName="trending-up"
                        description="شخص نشط"
                        colorScheme="green"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                    <StatCard
                        title="منتجات غير متوفرة"
                        value={stats.unavailableProductCount}
                        iconName="alert-circle"
                        description="منتج غير متاح حالياً"
                        colorScheme="orange"
                    />
                </div>
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
                    <RecentPersons persons={recentPersons as any} />
                </div>
            </div>
        </div>
    )
}
