"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Phone } from "lucide-react"
import Link from "next/link"

interface Customer {
    id: string
    name: string | null
    phoneNumber: string
    totalOrders: number
    isActive: boolean
    createdAt: Date
}

interface RecentCustomersProps {
    customers: Customer[]
}

export function RecentCustomers({ customers }: RecentCustomersProps) {
    if (!customers || customers.length === 0) {
        return (
            <Card className="col-span-3 border-border/50 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        أحدث العملاء
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        لا يوجد عملاء حتى الآن
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-3 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        أحدث العملاء
                    </CardTitle>
                    <Link
                        href="/crm"
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        عرض الكل ←
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {customers.map((customer) => (
                        <div
                            key={customer.id}
                            className="group flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all duration-200"
                        >
                            <div className="relative h-10 w-10 shrink-0 rounded-full bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                {customer.name ? customer.name[0].toUpperCase() : "؟"}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                        {customer.name || "عميل جديد"}
                                    </p>
                                    {customer.isActive && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                            نشط
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span className="font-mono">{customer.phoneNumber}</span>
                                </div>
                            </div>

                            <div className="text-left">
                                <p className="font-bold text-sm text-primary">
                                    {customer.totalOrders}
                                </p>
                                <p className="text-[10px] text-muted-foreground">طلب</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
