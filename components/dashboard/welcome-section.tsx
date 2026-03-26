"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Package, Users, TrendingUp, CalendarDays } from "lucide-react"
import Link from "next/link"
import { getCurrentUser } from "@/lib/actions/auth"

export function WelcomeSection() {
    const [userName, setUserName] = useState("")

    useEffect(() => {
        getCurrentUser().then(res => {
            if (res.success && res.data) {
                setUserName(res.data.name)
            }
        })
    }, [])

    const currentHour = new Date().getHours()
    let greeting = "مساء الخير"
    let emoji = "🌙"
    if (currentHour < 12) {
        greeting = "صباح الخير"
        emoji = "☀️"
    } else if (currentHour < 18) {
        greeting = "مساء النور"
        emoji = "🌤️"
    }

    const today = new Date()
    const formattedDate = today.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <div className="relative rounded-2xl border border-border/50 dark:border-white/6 bg-card/50 dark:bg-white/2 p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Text content */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        <span>{formattedDate}</span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {greeting}{userName && `، ${userName}`}
                        <span className="mr-2 inline-block">{emoji}</span>
                    </h1>

                    <p className="text-sm text-muted-foreground max-w-md">
                        إليك نظرة سريعة على أداء متجرك اليوم
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link href="/inventory">
                        <Button size="sm" className="rounded-lg font-semibold gap-1.5">
                            <Package className="size-4" />
                            إضافة منتج
                        </Button>
                    </Link>
                    <Link href="/persons">
                        <Button variant="outline" size="sm" className="rounded-lg font-semibold gap-1.5">
                            <Users className="size-4" />
                            إضافة شخص
                        </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="rounded-lg font-semibold gap-1.5 text-muted-foreground">
                        <TrendingUp className="size-4" />
                        التقارير
                    </Button>
                </div>
            </div>
        </div>
    )
}
