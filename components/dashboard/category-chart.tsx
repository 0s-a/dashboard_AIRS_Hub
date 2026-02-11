"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Layers } from "lucide-react"

interface CategoryData {
    name: string
    value: number
    color: string
}

interface CategoryChartProps {
    data: CategoryData[]
}

const COLORS = [
    "hsl(var(--primary))",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4"
]

export function CategoryChart({ data }: CategoryChartProps) {
    // If no data, show empty state
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-3 border-border/50 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        توزيع الفئات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        لا توجد بيانات كافية
                    </div>
                </CardContent>
            </Card>
        )
    }

    const dataWithColors = data.map((item, index) => ({
        ...item,
        color: item.color || COLORS[index % COLORS.length]
    }))

    return (
        <Card className="col-span-3 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    توزيع الفئات
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                    نسبة المنتجات حسب الفئات
                </p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={dataWithColors}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {dataWithColors.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px"
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
