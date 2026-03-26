"use client"

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
        iconBg: "bg-blue-500/8 group-hover:bg-blue-500/15",
        iconColor: "text-blue-600 dark:text-blue-400",
        accentBar: "from-blue-500 to-cyan-400",
        gradientFrom: "from-blue-600",
        gradientTo: "to-blue-400",
        dotColor: "bg-blue-500",
        dotShadow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]",
        hoverBorder: "hover:border-blue-500/30",
        bgGlow: "bg-blue-500/5 dark:bg-blue-500/10",
    },
    green: {
        iconBg: "bg-emerald-500/8 group-hover:bg-emerald-500/15",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        accentBar: "from-emerald-500 to-teal-400",
        gradientFrom: "from-emerald-600",
        gradientTo: "to-emerald-400",
        dotColor: "bg-emerald-500",
        dotShadow: "shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        hoverBorder: "hover:border-emerald-500/30",
        bgGlow: "bg-emerald-500/5 dark:bg-emerald-500/10",
    },
    purple: {
        iconBg: "bg-purple-500/8 group-hover:bg-purple-500/15",
        iconColor: "text-purple-600 dark:text-purple-400",
        accentBar: "from-purple-500 to-pink-400",
        gradientFrom: "from-purple-600",
        gradientTo: "to-purple-400",
        dotColor: "bg-purple-500",
        dotShadow: "shadow-[0_0_10px_rgba(168,85,247,0.5)]",
        hoverBorder: "hover:border-purple-500/30",
        bgGlow: "bg-purple-500/5 dark:bg-purple-500/10",
    },
    orange: {
        iconBg: "bg-orange-500/8 group-hover:bg-orange-500/15",
        iconColor: "text-orange-600 dark:text-orange-400",
        accentBar: "from-orange-500 to-amber-400",
        gradientFrom: "from-orange-600",
        gradientTo: "to-orange-400",
        dotColor: "bg-orange-500",
        dotShadow: "shadow-[0_0_10px_rgba(249,115,22,0.5)]",
        hoverBorder: "hover:border-orange-500/30",
        bgGlow: "bg-orange-500/5 dark:bg-orange-500/10",
    },
    indigo: {
        iconBg: "bg-indigo-500/8 group-hover:bg-indigo-500/15",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        accentBar: "from-indigo-500 to-violet-400",
        gradientFrom: "from-indigo-600",
        gradientTo: "to-indigo-400",
        dotColor: "bg-indigo-500",
        dotShadow: "shadow-[0_0_10px_rgba(99,102,241,0.5)]",
        hoverBorder: "hover:border-indigo-500/30",
        bgGlow: "bg-indigo-500/5 dark:bg-indigo-500/10",
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
            "relative overflow-hidden group border border-border/40 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 rounded-2xl",
            colors.hoverBorder
        )}>
            {/* Accent top bar */}
            <div className={cn("h-1 w-full bg-linear-to-r", colors.accentBar)} />

            {/* Background glow on hover */}
            <div className={cn(
                "absolute -top-[50%] -right-[30%] w-[60%] h-[80%] rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                colors.bgGlow
            )} />

            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-6">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] group-hover:text-foreground/70 transition-colors duration-300">
                    {title}
                </CardTitle>
                <div className={cn(
                    "p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                    colors.iconBg
                )}>
                    <Icon className={cn("h-5 w-5 transition-colors duration-300", colors.iconColor)} />
                </div>
            </CardHeader>
            <CardContent className="relative px-6 pb-6">
                <div className="flex items-baseline gap-2">
                    <div className={cn(
                        "text-4xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-br font-sans transition-all duration-300",
                        colors.gradientFrom,
                        colors.gradientTo
                    )}>
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
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2 font-medium">
                        <span className={cn(
                            "inline-flex size-2 rounded-full animate-pulse",
                            colors.dotColor,
                            colors.dotShadow
                        )} />
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
