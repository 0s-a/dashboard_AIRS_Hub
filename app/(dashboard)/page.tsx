import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { CategoryChart } from "@/components/dashboard/category-chart"
import { RecentProducts } from "@/components/dashboard/recent-products"
import { RecentCustomers } from "@/components/dashboard/recent-customers"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

// Cache dashboard data for 60 seconds to improve performance
const getDashboardData = unstable_cache(
    async () => {
        // Optimize: Run all queries in parallel using Promise.all
        const [
            productCount,
            customerCount,
            activeCustomerCount,
            recentProducts,
            recentCustomers,
            categoryGroups
        ] = await Promise.all([
            prisma.product.count(),
            prisma.customer.count(),
            prisma.customer.count({ where: { isActive: true } }),
            // Get recent products (last 5) - optimized with specific fields only
            prisma.product.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    category: {
                        select: {
                            name: true
                        }
                    },
                    price: true,
                    imagePath: true,
                    isAvailable: true,
                    createdAt: true
                }
            }),
            // Get recent customers (last 5) - optimized with specific fields only
            prisma.customer.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    totalOrders: true,
                    isActive: true,
                    createdAt: true
                }
            }),
            // Get category distribution - group by categoryId then fetch category names
            prisma.product.groupBy({
                by: ['categoryId'],
                _count: { categoryId: true },
                where: {
                    categoryId: { not: null }
                }
            })
        ])

        // Low stock count (mock for now)
        const lowStockCount = 0

        // Fetch category names for the groups
        const categoryIds = categoryGroups.map(g => g.categoryId).filter((id): id is string => id !== null)
        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true }
        })

        // Create a map for quick lookup
        const categoryMap = new Map(categories.map(c => [c.id, c.name]))

        // Category data transformation
        const categoryData = categoryGroups.map((group, index) => ({
            name: categoryMap.get(group.categoryId!) || 'غير مصنف',
            value: group._count.categoryId,
            color: ['hsl(var(--primary))', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][index % 6]
        }))

        // Generate activity data for last 7 days (optimized)
        const activityData = await generateActivityData()

        return {
            stats: {
                productCount,
                customerCount,
                activeCustomerCount,
                lowStockCount
            },
            recentProducts: recentProducts.map(p => ({
                ...p,
                category: p.category?.name || 'غير مصنف',
                price: Number(p.price)
            })),
            recentCustomers,
            categoryData,
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

        const customersCount = await prisma.customer.count({
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
            customers: customersCount
        })
    }

    return data
}

export default async function DashboardPage() {
    const { stats, recentProducts, recentCustomers, categoryData, activityData } = await getDashboardData()

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <WelcomeSection />

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="عدد المنتجات"
                    value={stats.productCount}
                    iconName="package"
                    description="منتج متوفر في المخزون"
                    colorScheme="indigo"
                />
                <StatCard
                    title="إجمالي العملاء"
                    value={stats.customerCount}
                    iconName="users"
                    description="عميل مسجل حالياً"
                    colorScheme="blue"
                />
                <StatCard
                    title="العملاء النشطون"
                    value={stats.activeCustomerCount}
                    iconName="trending-up"
                    description="عميل نشط"
                    colorScheme="green"
                />
                <StatCard
                    title="مخزون منخفض"
                    value={stats.lowStockCount}
                    iconName="alert-circle"
                    description="منتج يحتاج تعبئة"
                    colorScheme="orange"
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <ActivityChart data={activityData} />
                <CategoryChart data={categoryData} />
            </div>

            {/* Recent Items */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
                <RecentProducts products={recentProducts} />
                <RecentCustomers customers={recentCustomers} />
            </div>
        </div>
    )
}
