"use client"
import { useState, useEffect } from "react"
import { Plus, Coins, CircleDollarSign, ArrowLeftRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrencySheet } from "@/components/currencies/currency-sheet"
import { CurrencyTable } from "@/components/currencies/currency-table"
import { getCurrencies } from "@/lib/actions/currencies"
import { Currency } from "@prisma/client"
// exchangeRate comes back as string (serialized from Prisma Decimal)
export type SerializedCurrency = Omit<Currency, 'exchangeRate'> & { exchangeRate: string | null }
export default function CurrenciesPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedCurrency, setSelectedCurrency] = useState<SerializedCurrency | undefined>()
    const [currencies, setCurrencies] = useState<SerializedCurrency[]>([])
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
    const defaultCurrency   = currencies.find(c => c.isDefault)
    const withRate          = currencies.filter(c => !c.isDefault && c.exchangeRate != null)
    const missingRate       = currencies.filter(c => !c.isDefault && c.exchangeRate == null)
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        إدارة العملات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        أضف وعدّل العملات وأسعار الصرف المستخدمة في التسعير
                    </p>
                </div>
                <Button onClick={() => { setSelectedCurrency(undefined); setIsSheetOpen(true) }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة عملة
                </Button>
            </div>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {/* Total */}
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
                {/* Default */}
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">العملة الرئيسية</p>
                            <h3 className="text-xl font-bold mt-2 truncate">
                                {defaultCurrency ? `${defaultCurrency.symbol} — ${defaultCurrency.name}` : "لم تُحدد"}
                            </h3>
                        </div>
                        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <CircleDollarSign className="size-6 text-amber-600" />
                        </div>
                    </div>
                </div>
                {/* Exchange rates */}
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">أسعار الصرف</p>
                            <h3 className="text-3xl font-bold mt-2">{withRate.length}</h3>
                            {missingRate.length > 0 && (
                                <p className="text-xs text-amber-500 font-medium mt-1 flex items-center gap-1">
                                    <AlertTriangle className="size-3" />
                                    {missingRate.length} بدون سعر صرف
                                </p>
                            )}
                        </div>
                        <div className={`size-12 rounded-xl flex items-center justify-center ${missingRate.length > 0 ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                            <ArrowLeftRight className={`size-6 ${missingRate.length > 0 ? "text-amber-500" : "text-blue-500"}`} />
                        </div>
                    </div>
                </div>
            </div>
            {/* Exchange Rate Summary — shown when at least 2 currencies have rates */}
            {withRate.length > 0 && defaultCurrency && (
                <div className="glass-panel rounded-xl border border-border/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowLeftRight className="size-4 text-primary" />
                        <h2 className="text-sm font-bold">جدول المصارفة — نسبةً إلى {defaultCurrency.symbol} ({defaultCurrency.name})</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {withRate.map(c => {
                            const rate = Number(c.exchangeRate)
                            return (
                                <div key={c.id}
                                    className="flex flex-col gap-1 rounded-xl bg-muted/30 border border-border/30 px-4 py-3 hover:border-primary/30 hover:bg-primary/3 transition-all cursor-pointer group"
                                    onClick={() => { setSelectedCurrency(c); setIsSheetOpen(true) }}>
                                    {/* Currency badge */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10">
                                                <span className="text-xs font-bold text-primary">{c.symbol}</span>
                                            </div>
                                            <span className="text-xs font-bold">{c.code}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-muted-foreground/50 group-hover:text-primary/40 transition-colors">تعديل ←</span>
                                    </div>
                                    {/* Rate */}
                                    <div className="mt-1">
                                        <p className="text-[10px] text-muted-foreground">1 {defaultCurrency.symbol} =</p>
                                        <p className="font-mono font-black text-xl tabular-nums leading-tight">
                                            {rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-sm font-bold text-muted-foreground ml-1">{c.symbol}</span>
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                                            1 {c.symbol} = {(1 / rate).toFixed(6)} {defaultCurrency.symbol}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        {/* Placeholder cards for currencies missing rates */}
                        {missingRate.map(c => (
                            <div key={c.id}
                                className="flex flex-col gap-1 rounded-xl border border-dashed border-amber-300/50 bg-amber-500/3 px-4 py-3 cursor-pointer hover:border-amber-400/70 transition-all"
                                onClick={() => { setSelectedCurrency(c); setIsSheetOpen(true) }}>
                                <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <span className="text-xs font-bold text-amber-600">{c.symbol}</span>
                                    </div>
                                    <span className="text-xs font-bold text-amber-600">{c.code}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <AlertTriangle className="size-3 text-amber-500" />
                                    <p className="text-[10px] text-amber-500 font-medium">لم يُحدَّد سعر الصرف</p>
                                </div>
                                <p className="text-[9px] text-muted-foreground/50 mt-0.5">انقر للإضافة</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Table */}
            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <CurrencyTable data={currencies} onRefresh={loadCurrencies} />
            </div>
            {/* Sheet */}
            <CurrencySheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                currency={selectedCurrency}
                baseCurrencySymbol={defaultCurrency?.symbol}
            />
        </div>
    )
}
