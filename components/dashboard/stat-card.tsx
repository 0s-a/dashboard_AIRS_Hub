import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Package,
    Users,
    TrendingUp,
    AlertCircle,
    Activity,
    Layers
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap = {
    "package": Package,
    "users": Users,
    "trending-up": TrendingUp,
    "alert-circle": AlertCircle,
    "activity": Activity,
    "layers": Layers    
}

interface StatCardProps {
    title: string
    value: string | number
    iconName: keyof typeof iconMap
    description?: string
    trend?: {
        value: number
        isPositive: boolean
    }
    colorScheme?: "blue" | "green" | "purple" | "orange" | "indigo"
}

const colorSchemes = {
    blue: {
        iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
        accentBar: "bg-blue-500",
        dotColor: "bg-blue-500",
        hoverBorder: "hover:border-blue-500/30",
    },
    green: {
        iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
        accentBar: "bg-emerald-500",
        dotColor: "bg-emerald-500",
        hoverBorder: "hover:border-emerald-500/30",
    },
    purple: {
        iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
        accentBar: "bg-purple-500",
        dotColor: "bg-purple-500",
        hoverBorder: "hover:border-purple-500/30",
    },
    orange: {
        iconBg: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
        accentBar: "bg-orange-500",
        dotColor: "bg-orange-500",
        hoverBorder: "hover:border-orange-500/30",
    },
    indigo: {
        iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
        accentBar: "bg-indigo-500",
        dotColor: "bg-indigo-500",
        hoverBorder: "hover:border-indigo-500/30",
    }
}

function formatNumber(value: string | number): string {
    const num = typeof value === 'string' ? parseInt(value) : value
    if (isNaN(num)) return String(value)
    return num.toLocaleString('ar-EG')
}

export function StatCard({
    title,
    value,
    iconName,
    description,
    trend,
    colorScheme = "indigo"
}: StatCardProps) {
    const colors = colorSchemes[colorScheme]
    const Icon = iconMap[iconName]

    return (
        <Card className={cn(
            "relative overflow-hidden group border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl",
            colors.hoverBorder
        )}>
            {/* Accent top bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-[3px] w-full transition-opacity opacity-70 group-hover:opacity-100", colors.accentBar)} />

            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-6">
                <CardTitle className="text-xs font-bold text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                    {title}
                </CardTitle>
                <div className={cn(
                    "p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-105",
                    colors.iconBg
                )}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent className="relative px-6 pb-5 pt-2">
                <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold tracking-tight text-foreground font-sans">
                        {formatNumber(value)}
                    </div>
                    {trend && (
                        <div className={cn(
                            "text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-full",
                            trend.isPositive
                                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                : "text-red-700 dark:text-red-400 bg-red-500/10"
                        )}>
                            <span>{trend.isPositive ? "↑" : "↓"}</span>
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                        <span className={cn(
                            "inline-flex size-1.5 rounded-full",
                            colors.dotColor
                        )} />
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
