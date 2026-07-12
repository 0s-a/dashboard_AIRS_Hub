"use client"

import { useState, useTransition } from "react"
import { Tag, Edit2, Trash2, X, Copy, LayoutGrid, Calculator, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { updateProductPrice, deleteProductPrice } from "@/lib/actions/inventory"
import type { SerializedPrice, ProductUnitEntry } from "@/lib/types/product"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ComparisonTable } from "./comparison-table"
import { CopyPriceDialog } from "./copy-price-dialog"
import { SmartPricingWizard } from "./smart-pricing-wizard"
import { SinglePriceForm } from "./single-price-form"

// ─────────────────────────────────────────────────────────────
// Price List Panel — Grouped display + inline edit + delete
// ─────────────────────────────────────────────────────────────

type CurrencyOption = { id: string; name: string; symbol: string; exchangeRate?: number | null; isDefault?: boolean }

type EditingState = {
    priceId: string
    priceLabelId: string
    currencyId: string
    value: string
    unitId: string
} | null

interface PriceListPanelProps {
    skuId: string
    prices: SerializedPrice[]
    productUnits: ProductUnitEntry[]
    priceLabels: { id: string; name: string; isDefault?: boolean }[]
    currencies: CurrencyOption[]
    onPricesChange: (prices: SerializedPrice[]) => void
}

export function PriceListPanel({
    skuId, prices, productUnits, priceLabels, currencies, onPricesChange
}: PriceListPanelProps) {
    const [isPending, startTransition] = useTransition()
    const [editing, setEditing] = useState<EditingState>(null)
    const [isAddingSingle, setIsAddingSingle] = useState(false)
    const [isAddingAuto, setIsAddingAuto] = useState(false)
    const [comparisonView, setComparisonView] = useState(false)
    const [copyDialog, setCopyDialog] = useState<{ fromLabelId: string; fromLabelName: string } | null>(null)

    // Group prices by label name
    const groupedPrices = prices.reduce((acc, p) => {
        if (!acc[p.priceLabelName]) acc[p.priceLabelName] = []
        acc[p.priceLabelName].push(p)
        return acc
    }, {} as Record<string, SerializedPrice[]>)

    const labelNames = Object.keys(groupedPrices)
    const unitIds = [...new Set(prices.map(p => p.unitId))]

    // ── Handlers ─────────────────────────────────────────────

    const handleUpdate = () => {
        if (!editing) return
        const val = parseFloat(editing.value)
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")

        startTransition(async () => {
            const res = await updateProductPrice(editing.priceId, {
                value: val,
                priceLabelId: editing.priceLabelId,
                currencyId: editing.currencyId,
                unitId: editing.unitId,
            })
            if (res.success && res.data) {
                onPricesChange((res.data as any).productPrices || [])
                setEditing(null)
                toast.success("تم تحديث السعر")
            } else {
                toast.error((res as any).error || "فشل تحديث السعر")
            }
        })
    }

    const handleDelete = (priceId: string) => {
        startTransition(async () => {
            const res = await deleteProductPrice(priceId)
            if (res.success && res.data) {
                onPricesChange((res.data as any).productPrices || [])
                toast.success("تم حذف السعر")
            } else {
                toast.error((res as any).error || "فشل حذف السعر")
            }
        })
    }

    return (
        <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-border/40 bg-linear-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-bold bg-linear-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">تسعيرات المنتج</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">إدارة قوائم الأسعار والعملات لمختلف الوحدات</span>
                            <Badge variant="secondary" className="text-[10px] font-mono h-4 border-none bg-primary/5 text-primary/70">{prices.length}</Badge>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                {!isAddingAuto && !isAddingSingle && (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline"
                            className="gap-2 rounded-xl border-border/50 bg-background/50 backdrop-blur-xs"
                            onClick={() => setComparisonView(v => !v)}
                            disabled={isPending || prices.length === 0}>
                            <LayoutGrid className="h-4 w-4" />
                            {comparisonView ? "عرض القوائم" : "مقارنة"}
                        </Button>
                        <Button size="sm" variant="outline"
                            className="gap-2 rounded-xl border-border/50 bg-background/50 backdrop-blur-xs"
                            onClick={() => setIsAddingSingle(true)}
                            disabled={isPending || productUnits.length === 0}>
                            <Plus className="h-4 w-4" /> تسعيرة مخصصة
                        </Button>
                        <Button size="sm" variant="default"
                            className="gap-2 rounded-xl shadow-sm"
                            onClick={() => setIsAddingAuto(true)}
                            disabled={isPending || productUnits.length === 0}>
                            <Calculator className="h-4 w-4" /> تسعير ذكي
                        </Button>
                    </div>
                )}
            </div>

            <div className="divide-y divide-border/30">
                {/* Empty state */}
                {prices.length === 0 && !isAddingAuto && !isAddingSingle && (
                    <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
                        <div className="size-20 rounded-full bg-linear-to-b from-muted/50 to-muted/10 flex items-center justify-center border border-border/40 shadow-inner">
                            <Tag className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="max-w-xs space-y-1">
                            <p className="text-base font-bold text-foreground">لا توجد أسعار معرفة بعد</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">ابدأ بإضافة تسعيرات مخصصة أو استخدم التسعير الذكي لتوليد الأسعار لجميع الوحدات المختارة آلياً.</p>
                        </div>
                        <Button size="sm" variant="default" className="gap-2 mt-2 rounded-xl"
                            onClick={() => setIsAddingAuto(true)} disabled={productUnits.length === 0}>
                            <Calculator className="h-4 w-4" /> تشغيل مساعد التسعير الذكي
                        </Button>
                    </div>
                )}

                {/* Comparison view */}
                {comparisonView && prices.length > 0 && (
                    <div className="p-6 animate-in fade-in duration-200">
                        <ComparisonTable prices={prices} productUnits={productUnits} labelNames={labelNames} />
                    </div>
                )}

                {/* Smart pricing wizard */}
                {!comparisonView && isAddingAuto && (
                    <SmartPricingWizard
                        skuId={skuId}
                        productUnits={productUnits}
                        priceLabels={priceLabels}
                        currencies={currencies}
                        onComplete={(newPrices) => { onPricesChange(newPrices); setIsAddingAuto(false) }}
                        onCancel={() => setIsAddingAuto(false)}
                    />
                )}

                {/* Single price form */}
                {isAddingSingle && (
                    <SinglePriceForm
                        skuId={skuId}
                        productUnits={productUnits}
                        priceLabels={priceLabels}
                        currencies={currencies}
                        existingPrices={prices}
                        onComplete={(newPrices) => { onPricesChange(newPrices); setIsAddingSingle(false) }}
                        onCancel={() => setIsAddingSingle(false)}
                    />
                )}

                {/* Active prices grouped by label */}
                {!comparisonView && Object.entries(groupedPrices).map(([labelName, labelPrices]) => (
                    <div key={labelName} className="p-0 border-b border-border/20 last:border-b-0 group/label">
                        <div className="bg-muted/10 px-6 py-3 flex items-center justify-between group-hover/label:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                                <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{labelName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] h-4 bg-background px-1.5 border-border/50 text-muted-foreground">
                                    {labelPrices.length} تسعيرات
                                </Badge>
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg"
                                                onClick={() => {
                                                    const lbl = priceLabels.find(l => l.name === labelName)
                                                    if (lbl) setCopyDialog({ fromLabelId: lbl.id, fromLabelName: labelName })
                                                }}>
                                                <Copy className="size-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-[10px]">نسخ إلى قائمة أخرى</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="border-b border-border/20 bg-background/30 backdrop-blur-xs">
                                        <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase text-right w-1/4">الوحدة</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase text-center w-1/6">السعة</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase text-center w-1/6">العملة</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase text-left w-1/4">السعر</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase text-left w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {labelPrices.map((p) => (
                                        <tr key={p.id} className="group/row hover:bg-muted/10 transition-colors">
                                            {editing?.priceId === p.id ? (
                                                <td colSpan={5} className="px-6 py-4 bg-primary/[0.03]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-1/3">
                                                            <Select value={editing.unitId} onValueChange={(val) => setEditing({ ...editing, unitId: val })}>
                                                                <SelectTrigger className="h-9 rounded-xl bg-background border-border/50"><SelectValue /></SelectTrigger>
                                                                <SelectContent>{productUnits.map(pu => <SelectItem key={pu.id} value={pu.unitId}>{pu.unitName}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="w-1/3 relative">
                                                            <Input
                                                                type="number" step="0.01" min="0" value={editing.value}
                                                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                                                className="h-9 rounded-xl font-mono font-bold text-center bg-background"
                                                                autoFocus
                                                            />
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40">{p.currencySymbol}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            <Button size="sm" onClick={handleUpdate} disabled={isPending} className="rounded-xl h-9 px-4 shadow-sm shadow-primary/10">حفظ التعديل</Button>
                                                            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} disabled={isPending} className="h-9 w-9 border border-border/40 rounded-xl"><X className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-foreground">{p.unitName}</span>
                                                            {p.isAutoCalculated && <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] h-3 px-1 shadow-none">آلي</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-mono text-muted-foreground">×{productUnits.find(u => u.unitId === p.unitId)?.conversionFactor || 1}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{currencies.find(c => c.id === p.currencyId)?.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-left">
                                                        <div className="flex items-baseline justify-end gap-1.5">
                                                            <span className="text-xs font-bold text-muted-foreground/40 font-mono">{p.currencySymbol}</span>
                                                            <span className="text-lg font-mono font-bold tabular-nums text-foreground tracking-tight">
                                                                {Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-left">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                            <TooltipProvider delayDuration={0}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                                                            onClick={() => setEditing({ priceId: p.id, priceLabelId: p.priceLabelId, currencyId: p.currencyId, value: String(p.value), unitId: p.unitId })}>
                                                                            <Edit2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="text-[10px]">تعديل السعر</TooltipContent>
                                                                </Tooltip>
                                                                <AlertDialog>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" disabled={isPending}>
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-[10px] bg-destructive text-destructive-foreground">حذف</TooltipContent>
                                                                    </Tooltip>
                                                                    <AlertDialogContent className="rounded-3xl border-border/40 backdrop-blur-xl">
                                                                        <AlertDialogHeader>
                                                                            <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                                                                                <Trash2 className="h-6 w-6" />
                                                                            </div>
                                                                            <AlertDialogTitle className="text-xl font-bold">حذف السعر من {labelName}؟</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                أنت على وشك حذف سعر <span className="font-bold text-foreground">{p.unitName}</span> بقيمة <span className="font-bold text-foreground">{Number(p.value).toFixed(2)} {p.currencySymbol}</span> نهائياً.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter className="mt-6 gap-3">
                                                                            <AlertDialogCancel className="rounded-xl border-border/40 hover:bg-muted/50 h-11 flex-1">إلغاء</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 flex-1 shadow-lg shadow-destructive/20 border-none">حذف السعر</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </TooltipProvider>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* Help footer */}
                <div className="mt-12 mb-6 text-center space-y-4 px-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/40 text-[10px] font-medium text-muted-foreground/60 backdrop-blur-xs">
                        <div className="size-1.5 rounded-full bg-primary/40 animate-pulse" />
                        نظام التسعير العالمي الموحد • ERP Standard Alignment
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 max-w-sm mx-auto leading-relaxed">
                        يتم مزامنة جميع التغييرات في الوحدات والأسعار فور الحفظ مع قاعدة البيانات المركزية لضمان دقة التقارير وعمليات البيع.
                    </p>
                </div>
            </div>

            {/* Copy dialog */}
            {copyDialog && (
                <CopyPriceDialog
                    open={!!copyDialog}
                    fromLabelId={copyDialog.fromLabelId}
                    fromLabelName={copyDialog.fromLabelName}
                    priceLabels={priceLabels}
                    isPending={isPending}
                    onClose={() => setCopyDialog(null)}
                    onConfirm={async (toLabelId, pct) => {
                        const { copyPriceLabelPrices } = await import('@/lib/actions/inventory')
                        startTransition(async () => {
                            const res = await copyPriceLabelPrices(skuId, copyDialog.fromLabelId, toLabelId, pct)
                            if (res.success && res.data) {
                                onPricesChange((res.data as any).productPrices || [])
                                toast.success("تم نسخ الأسعار بنجاح")
                            } else {
                                toast.error((res as any).error || "فشل النسخ")
                            }
                            setCopyDialog(null)
                        })
                    }}
                />
            )}
        </div>
    )
}
