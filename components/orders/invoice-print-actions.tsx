"use client"

import { useEffect, useState } from "react"
import { Printer, ArrowRight } from "lucide-react"

export function InvoicePrintActions() {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        // طباعة تلقائية بعد تحميل الصفحة بوقت قصير
        const timer = setTimeout(() => {
            window.print()
        }, 500)
        return () => clearTimeout(timer)
    }, [])

    if (!isClient) return null

    return (
        <div className="print:hidden flex items-center justify-between w-full max-w-4xl mx-auto mb-6 p-4 bg-muted/30 rounded-xl border border-border">
            <button 
                onClick={() => window.close()} 
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowRight className="size-4" />
                إغلاق النافذة
            </button>
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
                <Printer className="size-4" />
                طباعة الفاتورة
            </button>
        </div>
    )
}
