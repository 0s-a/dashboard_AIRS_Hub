"use client"

import { useState, useEffect } from "react"
import { Plus, Coins, CheckCircle2, CircleDollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrencySheet } from "@/components/currencies/currency-sheet"
import { CurrencyTable } from "@/components/currencies/currency-table"
import { getCurrencies } from "@/lib/actions/currencies"
import { Currency } from "@prisma/client"

export default function CurrenciesPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | undefined>()
    const [currencies, setCurrencies] = useState<Currency[]>([])

    useEffect(() => {
        loadCurrencies()

        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            setSelectedCurrency(customEvent.detail)
            setIsSheetOpen(true)
        }

        window.addEventListener("edit-currency", handleEdit)
        return () => window.removeEventListener("edit-currency", handleEdit)
    }, [])

    const loadCurrencies = async () => {
        const res = await getCurrencies()
        if (res.success && res.data) setCurrencies(res.data)
    }

    const handleSheetClose = (open: boolean) => {
        if (!open) {
            setIsSheetOpen(false)
            setSelectedCurrency(undefined)
            loadCurrencies()
        }
    }

    const activeCurrencies = currencies.filter(c => c.isActive)
    const defaultCurrency = currencies.find(c => c.isDefault)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        إدارة العملات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        أضف وعدّل العملات المستخدمة في التسعير
                    </p>
                </div>
                <Button onClick={() => { setSelectedCurrency(undefined); setIsSheetOpen(true) }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة عملة
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي العملات</p>
                            <h3 className="text-3xl font-bold mt-2">{currencies.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Coins className="size-6 text-primary" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">العملات المفعّلة</p>
                            <h3 className="text-3xl font-bold mt-2">{activeCurrencies.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="size-6 text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">العملة الافتراضية</p>
                            <h3 className="text-xl font-bold mt-2 truncate">
                                {defaultCurrency ? `${defaultCurrency.symbol} — ${defaultCurrency.name}` : "لم تُحدد"}
                            </h3>
                        </div>
                        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <CircleDollarSign className="size-6 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <CurrencyTable data={currencies} />
            </div>

            {/* Sheet */}
            <CurrencySheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                currency={selectedCurrency}
            />
        </div>
    )
}
