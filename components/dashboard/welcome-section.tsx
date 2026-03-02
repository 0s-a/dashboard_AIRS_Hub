"use client"

import { Button } from "@/components/ui/button"
import { Package, Users, TrendingUp } from "lucide-react"
import Link from "next/link"

export function WelcomeSection() {
    const currentHour = new Date().getHours()

    let greeting = "مساء الخير"
    if (currentHour < 12) {
        greeting = "صباح الخير"
    } else if (currentHour < 18) {
        greeting = "مساء الخير"
    } else {
        greeting = "مساء الخير"
    }

    return (
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                    <span className="bg-clip-text text-transparent bg-linear-to-l from-primary via-indigo-600 to-purple-600">
                        {greeting}
                    </span>
                    <span className="inline-block animate-wave ml-2">👋</span>
                </h1>
                <p className="text-muted-foreground text-base max-w-2xl">
                    مرحباً بك في لوحة التحكم. إليك نظرة سريعة على أداء عملك اليوم
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Link href="/inventory">
                    <Button
                        className="group shadow-lg hover:shadow-xl transition-all duration-300"
                        size="lg"
                    >
                        <Package className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                        إضافة منتج
                    </Button>
                </Link>
                <Link href="/persons">
                    <Button
                        variant="outline"
                        className="group shadow-md hover:shadow-lg transition-all duration-300"
                        size="lg"
                    >
                        <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                        إضافة شخص
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    className="group"
                    size="lg"
                >
                    <TrendingUp className="h-4 w-4 mr-2 group-hover:translate-y-[-2px] transition-transform" />
                    التقارير
                </Button>
            </div>
        </div>
    )
}
