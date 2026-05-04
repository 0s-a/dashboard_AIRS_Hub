"use client"

import { useState, useTransition } from "react"
import { Calculator, X, Check, Loader2, Eye, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { addProductPricesForAllUnits } from "@/lib/actions/inventory"
import type { SerializedPrice, ProductUnitEntry } from "@/lib/types/product"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// ─────────────────────────────────────────────────────────────
// Smart Pricing Wizard
// Enter base price → auto-calculates all units × currencies
// ─────────────────────────────────────────────────────────────

type CurrencyOption = { id: string; name: string; symbol: string; exchangeRate?: number | null; isDefault?: boolean }

interface SmartPricingWizardProps {
    productId: string
    productUnits: ProductUnitEntry[]
    priceLabels: { id: string; name: string }[]
    currencies: CurrencyOption[]
    onComplete: (newPrices: SerializedPrice[]) => void
    onCancel: () => void
}

export function SmartPricingWizard({
    productId, productUnits, priceLabels, currencies, onComplete, onCancel
}: SmartPricingWizardProps) {
    const [isPending, startTransition] = useTransition()

    // Local state managed by parent via controlled props pattern —
    // we use uncontrolled local state here for simplicity
    const [labelId, setLabelId] = useState("")
    const [basePrice, setBasePrice] = useState("")
    const [currencyIds, setCurrencyIds] = useState<string[]>(
        () => currencies.filter(c => c.exchangeRate != null || c.isDefault).map(c => c.id)
    )

    const baseCurrency = currencies.find(c => c.isDefault) || currencies[0]
    const selectedCurrencies = currencies.filter(c => currencyIds.includes(c.id))

    const handleSubmit = () => {
        const baseVal = parseFloat(basePrice)
        if (!labelId) return toast.error("مسمى التسعيرة مطلوب")
        if (isNaN(baseVal) || baseVal < 0) return toast.error("السعر غير صحيح")
        if (productUnits.length === 0) return toast.error("أضف وحدات للمنتج أولاً")
        if (currencyIds.length === 0) return toast.error("حدد عملة واحدة على الأقل")

        startTransition(async () => {
            const currencyEntries = currencies
                .filter(c => currencyIds.includes(c.id))
                .map(c => {
                    const rate = c.isDefault ? 1 : (c.exchangeRate != null ? Number(c.exchangeRate) : null)
                    if (rate === null) return null
                    const basePriceValue = baseCurrency?.id === c.id ? baseVal : baseVal / rate
                    return { currencyId: c.id, basePriceValue }
                })
                .filter(Boolean) as { currencyId: string; basePriceValue: number }[]

            const res = await addProductPricesForAllUnits(productId, { priceLabelId: labelId, currencies: currencyEntries })
            if (res.success && res.data) {
                onComplete((res.data as any).productPrices || [])
                toast.success("تم توليد الأسعار بنجاح")
            } else {
                toast.error((res as any).error || "فشل إضافة الأسعار")
            }
        })
    }

    const toggleCurrency = (id: string) =>
        setCurrencyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

    return (
        <div className="p-6 bg-linear-to-b from-primary/3 to-transparent border-b border-primary/10 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">مساعد التسعير الذكي</h3>
                        <p className="text-[10px] text-muted-foreground">أدخل السعر بالعملة الرئيسية — يحسب تلقائياً بجميع العملات الأخرى</p>
                    </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={onCancel}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Label selector */}
                <div className="md:col-span-4 space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground/80">قائمة الأسعار</label>
                    <Select value={labelId} onValueChange={setLabelId}>
                        <SelectTrigger className="h-11 rounded-xl bg-background border-border/50">
                            <SelectValue placeholder="اختر القائمة" />
                        </SelectTrigger>
                        <SelectContent>
                            {priceLabels.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* Base price input */}
                <div className="md:col-span-5 space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground/80 flex items-center justify-between">
                        <span>سعر الوحدة الأساسية</span>
                        <Badge variant="outline" className="h-4 text-[9px] px-1 bg-muted/30">
                            {baseCurrency?.symbol ?? "—"} · {productUnits.find(u => u.isBase)?.unitName || "لا توجد وحدة"}
                        </Badge>
                    </label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground/50 text-sm">
                            {baseCurrency?.symbol || "$"}
                        </div>
                        <Input
                            type="number" step="0.01" min="0" autoFocus
                            value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                            placeholder="0.00"
                            className="h-11 rounded-xl bg-background border-border/50 pl-14 font-mono font-bold text-lg"
                        />
                    </div>
                </div>

                <div className="md:col-span-3">
                    <Button
                        className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 gap-2"
                        onClick={handleSubmit}
                        disabled={isPending || !labelId || !basePrice || currencyIds.length === 0}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        توليد وحفظ
                    </Button>
                </div>
            </div>

            {/* Currency selection */}
            {currencies.length > 0 && (
                <div className="mt-5 pt-5 border-t border-dashed border-border/40 space-y-3">
                    <div className="flex items-center gap-2">
                        <ArrowLeftRight className="size-3.5 text-muted-foreground" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">العملات المشمولة</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {currencies.map(c => {
                            const isBase = c.isDefault
                            const selected = currencyIds.includes(c.id)
                            const hasRate = isBase || c.exchangeRate != null
                            return (
                                <button key={c.id} type="button"
                                    disabled={!hasRate}
                                    onClick={() => toggleCurrency(c.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                        !hasRate ? 'opacity-40 cursor-not-allowed border-border/30 text-muted-foreground'
                                        : selected ? 'bg-primary/10 border-primary/50 text-primary'
                                        : 'border-border/50 hover:border-border hover:bg-muted/30'
                                    }`}>
                                    {selected && <Check className="size-3" />}
                                    {c.symbol} {c.name}
                                    {isBase && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded">رئيسية</span>}
                                    {!hasRate && <span className="text-[9px] text-destructive">لا يوجد صرف</span>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Live preview table */}
            {basePrice && productUnits.length > 0 && currencyIds.length > 0 && (() => {
                const baseVal = parseFloat(basePrice)
                if (isNaN(baseVal)) return null
                return (
                    <div className="mt-5 pt-5 border-t border-dashed border-border/50 animate-in fade-in duration-300">
                        <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Eye className="w-3 h-3" /> معاينة الأسعار المقترحة
                        </h4>
                        <div className="rounded-xl border border-border/30 overflow-hidden bg-background/20">
                            <table className="w-full text-right border-collapse text-xs">
                                <thead className="bg-muted/30 border-b border-border/30">
                                    <tr>
                                        <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase">الوحدة</th>
                                        <th className="px-3 py-2 text-[9px] font-bold text-muted-foreground text-center">×</th>
                                        {selectedCurrencies.map(c => (
                                            <th key={c.id} className="px-4 py-2 text-[9px] font-bold text-muted-foreground text-left">{c.symbol} {c.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {productUnits.map(u => (
                                        <tr key={u.unitId} className="hover:bg-primary/[0.01]">
                                            <td className="px-4 py-2.5 font-bold">{u.unitName}</td>
                                            <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">×{u.conversionFactor}</td>
                                            {selectedCurrencies.map(c => {
                                                const rate = c.isDefault ? 1 : (c.exchangeRate != null ? Number(c.exchangeRate) : null)
                                                const unitBasePrice = rate !== null
                                                    ? (baseCurrency?.id === c.id ? baseVal : baseVal / rate)
                                                    : null
                                                const finalPrice = unitBasePrice !== null ? unitBasePrice * u.conversionFactor : null
                                                return (
                                                    <td key={c.id} className="px-4 py-2.5 text-left">
                                                        <span className="font-mono font-bold text-primary">
                                                            {finalPrice !== null ? finalPrice.toFixed(2) : "—"}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

