"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
            <h2 className="text-xl font-bold">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted-foreground max-w-md">
                تعذّر تحميل الصفحة. يُرجى المحاولة مجدداً.
            </p>
            <Button onClick={reset}>إعادة المحاولة</Button>
        </div>
    )
}
