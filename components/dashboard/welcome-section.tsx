import { Button } from "@/components/ui/button"
import { Package, Users, CalendarDays } from "lucide-react"
import Link from "next/link"

export function WelcomeSection({ userName }: { userName: string }) {
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
    const formattedDate = today.toLocaleDateString('ar-YE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <div className="relative rounded-2xl border border-border/50 dark:border-white/6 bg-card/50 dark:bg-white/2 p-6 md:p-8 backdrop-blur-sm shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Text content */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        <span>{formattedDate}</span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {greeting}{userName ? `، ${userName}` : ''}
                        <span className="mr-2 inline-block">{emoji}</span>
                    </h1>

                    <p className="text-sm text-muted-foreground max-w-md">
                        إليك نظرة سريعة على أداء متجرك اليوم
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link href="/items">
                        <Button size="sm" className="rounded-lg font-semibold gap-1.5 shadow-sm transition-all hover:-translate-y-0.5">
                            <Package className="size-4" />
                            إضافة صنف
                        </Button>
                    </Link>
                    <Link href="/customers">
                        <Button variant="outline" size="sm" className="rounded-lg font-semibold gap-1.5 shadow-sm transition-all hover:-translate-y-0.5">
                            <Users className="size-4" />
                            إضافة عميل
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
