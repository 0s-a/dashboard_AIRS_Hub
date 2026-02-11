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
        iconBg: "bg-blue-500/5 group-hover:bg-blue-500/10",
        iconColor: "text-blue-500",
        gradientFrom: "from-blue-600",
        gradientTo: "to-blue-400",
        dotColor: "bg-blue-500",
        dotShadow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]"
    },
    green: {
        iconBg: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
        iconColor: "text-emerald-500",
        gradientFrom: "from-emerald-600",
        gradientTo: "to-emerald-400",
        dotColor: "bg-emerald-500",
        dotShadow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]"
    },
    purple: {
        iconBg: "bg-purple-500/5 group-hover:bg-purple-500/10",
        iconColor: "text-purple-500",
        gradientFrom: "from-purple-600",
        gradientTo: "to-purple-400",
        dotColor: "bg-purple-500",
        dotShadow: "shadow-[0_0_8px_rgba(168,85,247,0.5)]"
    },
    orange: {
        iconBg: "bg-orange-500/5 group-hover:bg-orange-500/10",
        iconColor: "text-orange-500",
        gradientFrom: "from-orange-600",
        gradientTo: "to-orange-400",
        dotColor: "bg-orange-500",
        dotShadow: "shadow-[0_0_8px_rgba(249,115,22,0.5)]"
    },
    indigo: {
        iconBg: "bg-indigo-500/5 group-hover:bg-indigo-500/10",
        iconColor: "text-indigo-500",
        gradientFrom: "from-indigo-600",
        gradientTo: "to-indigo-400",
        dotColor: "bg-indigo-500",
        dotShadow: "shadow-[0_0_8px_rgba(99,102,241,0.5)]"
    }
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
        <Card className="card-premium overflow-hidden group border-none shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">
                    {title}
                </CardTitle>
                <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110",
                    colors.iconBg
                )}>
                    <Icon className={cn("h-5 w-5", colors.iconColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className={cn(
                        "text-4xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-br font-sans",
                        colors.gradientFrom,
                        colors.gradientTo
                    )}>
                        {value}
                    </div>
                    {trend && (
                        <div className={cn(
                            "text-sm font-bold flex items-center gap-1",
                            trend.isPositive ? "text-emerald-600" : "text-red-600"
                        )}>
                            <span>{trend.isPositive ? "↑" : "↓"}</span>
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 font-medium">
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
