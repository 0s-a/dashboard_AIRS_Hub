"use client"

import { useState, useTransition } from "react"
import { Plus, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { addItemPrice } from "@/lib/actions/items"
import type { SerializedPrice, ItemUnitEntry } from "@/lib/types/item"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// ─────────────────────────────────────────────────────────────
// Single Price Form — Add a custom price (default currency only)
// ─────────────────────────────────────────────────────────────

interface SinglePriceFormProps {
    itemId: string
    itemUnits: ItemUnitEntry[]
    priceLabels: { id: string; name: string; isDefault?: boolean }[]
    defaultCurrencySymbol?: string
    existingPrices: SerializedPrice[]
    onComplete: (newPrices: SerializedPrice[]) => void
    onCancel: () => void
}

export function SinglePriceForm({
    itemId, itemUnits, priceLabels, defaultCurrencySymbol, existingPrices, onComplete, onCancel
}: SinglePriceFormProps) {
    const [isPending, startTransition] = useTransition()
    const defaultLabel = priceLabels.find(pl => pl.isDefault)
    const [labelId, setLabelId] = useState(defaultLabel?.id ?? "")
    const [unitId, setUnitId] = useState("")
    const [value, setValue] = useState("")

    const comboExists =
        labelId && unitId &&
        existingPrices.some(p => p.priceLabelId === labelId && p.unitId === unitId)

    const handleSubmit = () => {
        const val = parseFloat(value)
        if (!labelId) return toast.error("مسمى التسعيرة مطلوب")
        if (!unitId) return toast.error("الوحدة مطلوبة")
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")

        startTransition(async () => {
            const res = await addItemPrice(itemId, {
                priceLabelId: labelId,
                unitId,
                value: val,
                isAutoCalculated: false,
            })
            if (res.success && res.data) {
                onComplete((res.data as any).itemPrices || [])
                toast.success("تم إضافة السعر")
            } else {
                toast.error((res as any).error || "فشل إضافة السعر")
            }
        })
    }

    return (
        <div className="p-6 bg-linear-to-b from-muted/5 to-transparent border-b border-border/50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-muted/10 border border-border/50 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">إضافة تسعيرة مخصصة</h3>
                        <p className="text-[10px] text-muted-foreground">
                            السعر يُحفظ بالعملة الافتراضية{defaultCurrencySymbol ? ` (${defaultCurrencySymbol})` : ''}
                        </p>
                    </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={onCancel}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground/80">القائمة</label>
                    <Select value={labelId} onValueChange={setLabelId}>
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50">
                            <SelectValue placeholder="اختر القائمة" />
                        </SelectTrigger>
                        <SelectContent>
                            {priceLabels.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground/80">الوحدة</label>
                    <Select value={unitId} onValueChange={setUnitId}>
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50">
                            <SelectValue placeholder="اختر الوحدة" />
                        </SelectTrigger>
                        <SelectContent>
                            {itemUnits.map(pu => <SelectItem key={pu.id} value={pu.unitId}>{pu.unitName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground/80">
                        السعر{defaultCurrencySymbol ? ` (${defaultCurrencySymbol})` : ''}
                    </label>
                    <Input
                        type="number" step="0.01" min="0" autoFocus
                        value={value} onChange={(e) => setValue(e.target.value)}
                        className="h-10 rounded-xl bg-background border-border/50 font-mono font-bold text-lg"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
                    />
                </div>
            </div>

            {comboExists && (
                <div className="mt-4 flex items-start gap-2 text-[10px] text-amber-600 bg-amber-50/50 border border-amber-200/50 rounded-xl px-4 py-3">
                    <span>هذه التسعيرة موجودة مسبقاً لهذه الوحدة والقائمة.</span>
                </div>
            )}

            <div className="flex items-center gap-3 mt-6">
                <Button
                    size="sm" className="rounded-xl px-6"
                    onClick={handleSubmit}
                    disabled={isPending || !labelId || !unitId || !value}
                >
                    {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    حفظ السعر
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>تجاهل</Button>
            </div>
        </div>
    )
}
