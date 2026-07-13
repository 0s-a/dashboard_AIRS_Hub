"use client"

import { useState, useTransition } from "react"
import { Calculator, X, Check, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { addProductPricesForAllUnits } from "@/lib/actions/inventory"
import { convertFromDefault } from "@/lib/currency-utils"
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
// Enter base price in default currency → generates all units
// Optional live preview of converted currencies (not saved)
// ─────────────────────────────────────────────────────────────

type CurrencyOption = { id: string; name: string; symbol: string; exchangeRate?: number | null; isDefault?: boolean }

interface SmartPricingWizardProps {
    productId: string
    productUnits: ProductUnitEntry[]
    priceLabels: { id: string; name: string; isDefault?: boolean }[]
    currencies: CurrencyOption[]
    onComplete: (newPrices: SerializedPrice[]) => void
    onCancel: () => void
}

export function SmartPricingWizard({
    productId, productUnits, priceLabels, currencies, onComplete, onCancel
}: SmartPricingWizardProps) {
    const [isPending, startTransition] = useTransition()

    const defaultLabel = priceLabels.find(pl => pl.isDefault)
    const [labelId, setLabelId] = useState(defaultLabel?.id ?? "")
    const [basePrice, setBasePrice] = useState("")

    const baseCurrency = currencies.find(c => c.isDefault) || currencies[0]
    const previewCurrencies = currencies.filter(c => c.isDefault || c.exchangeRate != null)

    const handleSubmit = () => {
        const baseVal = parseFloat(basePrice)
        if (!labelId) return toast.error("مسمى التسعيرة مطلوب")
        if (isNaN(baseVal) || baseVal < 0) return toast.error("السعر غير صحيح")
        if (productUnits.length === 0) return toast.error("أضف وحدات للمنتج أولاً")

        startTransition(async () => {
            const res = await addProductPricesForAllUnits(productId, {
                priceLabelId: labelId,
                basePriceValue: baseVal,
            })
            if (res.success && res.data) {
                onComplete((res.data as any).productPrices || [])
                toast.success("تم توليد الأسعار بنجاح")
            } else {
                toast.error((res as any).error || "فشل إضافة الأسعار")
            }
        })
    }

    return (
        <div className="p-6 bg-linear-to-b from-primary/3 to-transparent border-b border-primary/10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">مساعد التسعير الذكي</h3>
                        <p className="text-[10px] text-muted-foreground">
                            أدخل السعر بالعملة الافتراضية — يُحسب لجميع الوحدات؛ التحويل لعملات أخرى عند العرض فقط
                        </p>
                    </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={onCancel}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
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
                        disabled={isPending || !labelId || !basePrice}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        توليد وحفظ
                    </Button>
                </div>
            </div>

            {basePrice && productUnits.length > 0 && (() => {
                const baseVal = parseFloat(basePrice)
                if (isNaN(baseVal)) return null
                return (
                    <div className="mt-5 pt-5 border-t border-dashed border-border/50 animate-in fade-in duration-300">
                        <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Eye className="w-3 h-3" /> معاينة (محفوظ بالافتراضية · الباقي تحويل حي)
                        </h4>
                        <div className="rounded-xl border border-border/30 overflow-hidden bg-background/20">
                            <table className="w-full text-right border-collapse text-xs">
                                <thead className="bg-muted/30 border-b border-border/30">
                                    <tr>
                                        <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase">الوحدة</th>
                                        <th className="px-3 py-2 text-[9px] font-bold text-muted-foreground text-center">×</th>
                                        {previewCurrencies.map(c => (
                                            <th key={c.id} className="px-4 py-2 text-[9px] font-bold text-muted-foreground text-left">
                                                {c.symbol} {c.name}
                                                {c.isDefault ? '' : ' · معاينة'}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {productUnits.map(u => (
                                        <tr key={u.unitId} className="hover:bg-primary/[0.01]">
                                            <td className="px-4 py-2.5 font-bold">{u.unitName}</td>
                                            <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">×{u.conversionFactor}</td>
                                            {previewCurrencies.map(c => {
                                                const unitDefault = baseVal * u.conversionFactor
                                                const finalPrice = convertFromDefault(unitDefault, c)
                                                return (
                                                    <td key={c.id} className="px-4 py-2.5 text-left">
                                                        <span className="font-mono font-bold text-primary">
                                                            {finalPrice.toFixed(2)}
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
