"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp } from "lucide-react"

interface ActivityData {
    date: string
    products: number
    persons: number
}

interface ActivityChartProps {
    data: ActivityData[]
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-2xl" dir="rtl">
            <p className="text-xs font-bold text-foreground mb-2">{label}</p>
            <div className="space-y-1.5">
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground font-medium">{entry.name}:</span>
                        <span className="font-bold text-foreground">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Custom legend
function CustomLegend({ payload }: any) {
    if (!payload?.length) return null
    return (
        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border/30">
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                    <div className="size-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-bold text-muted-foreground">{entry.value}</span>
                </div>
            ))}
        </div>
    )
}

export function ActivityChart({ data }: ActivityChartProps) {
    return (
        <Card className="col-span-4 border border-border/40 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl overflow-hidden">
            {/* Accent top bar */}
            <div className="h-1 w-full bg-linear-to-r from-primary via-indigo-500 to-purple-500" />

            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/8">
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">نشاط النظام</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                إحصائيات المنتجات والأشخاص في آخر 7 أيام
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2 pr-4">
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="4 4"
                            stroke="hsl(var(--border))"
                            strokeOpacity={0.5}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Area
                            type="monotone"
                            dataKey="products"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorProducts)"
                            name="المنتجات"
                            dot={false}
                            activeDot={{
                                r: 6,
                                stroke: 'hsl(var(--primary))',
                                strokeWidth: 2,
                                fill: 'hsl(var(--card))',
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="persons"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorCustomers)"
                            name="الأشخاص"
                            dot={false}
                            activeDot={{
                                r: 6,
                                stroke: '#10b981',
                                strokeWidth: 2,
                                fill: 'hsl(var(--card))',
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
