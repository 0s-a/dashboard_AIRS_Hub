"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Tag,
    Loader2,
    Scale,
    Calculator,
    Save,
    Barcode,
    Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
    addProductPrice, 
    updateProductPrice, 
    deleteProductPrice,
    setProductUnits,
    addProductPricesForAllUnits
} from "@/lib/actions/inventory"
import type { SerializedPrice } from "@/lib/actions/inventory"
import { getPriceLabels } from "@/lib/actions/price-labels"
import { getActiveCurrencies } from "@/lib/actions/currencies"
import { getActiveUnits } from "@/lib/actions/units"
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

export type ProductUnitEntry = {
    id: string
    unitId: string
    unitName: string
    conversionFactor: number
    barcode?: string | null
    isBase: boolean
    order: number
}

type PricingClientProps = {
    product: {
        id: string
        itemNumber: string
        name: string
        productPrices: SerializedPrice[]
        productUnits?: ProductUnitEntry[]
    }
}

type UnitOption = { id: string; name: string; pluralName?: string | null }

type EditingState = {
    priceId: string
    priceLabelId: string
    currencyId: string
    value: string
    unitId: string
} | null

export function PricingSection({ product }: PricingClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    
    // Core data state
    const [prices, setPrices] = useState<SerializedPrice[]>(product.productPrices || [])
    const [productUnits, setProductUnitsState] = useState<ProductUnitEntry[]>(product.productUnits || [])
    
    // Lookups
    const [priceLabels, setPriceLabels] = useState<{ id: string; name: string }[]>([])
    const [currencies, setCurrencies] = useState<{ id: string; name: string; symbol: string }[]>([])
    const [sysUnits, setSysUnits] = useState<UnitOption[]>([])

    // UI state
    const [editing, setEditing] = useState<EditingState>(null)
    const [isAddingSingle, setIsAddingSingle] = useState(false)
    const [isAddingAuto, setIsAddingAuto] = useState(false)
    
    // Form state (Auto Pricing)
    const [autoLabelId, setAutoLabelId] = useState("")
    const [autoCurrencyId, setAutoCurrencyId] = useState("")
    const [autoBasePrice, setAutoBasePrice] = useState("")

    // Form state (Single Price)
    const [singleLabelId, setSingleLabelId] = useState("")
    const [singleCurrencyId, setSingleCurrencyId] = useState("")
    const [singleUnitId, setSingleUnitId] = useState("")
    const [singleValue, setSingleValue] = useState("")

    useEffect(() => {
        getPriceLabels().then((res) => { if (res.success && res.data) setPriceLabels(res.data) })
        getActiveCurrencies().then((res) => {
            if (res.success && res.data) {
                setCurrencies(res.data)
                const def = res.data.find((c: any) => c.isDefault) || res.data[0]
                if (def && !autoCurrencyId) {
                    setAutoCurrencyId(def.id)
                    setSingleCurrencyId(def.id)
                }
            }
        })
        getActiveUnits().then((res) => { if (res.success && res.data) setSysUnits(res.data) })
    }, [])

    // ─── UNITS MANAGEMENT ─────────────────────────────────────────────
    
    // Toggle a unit for this product
    const toggleProductUnit = (unitId: string) => {
        const exists = productUnits.find(u => u.unitId === unitId)
        let newUnits = [...productUnits]
        
        if (exists) {
            newUnits = newUnits.filter(u => u.unitId !== unitId)
        } else {
            newUnits.push({
                id: Math.random().toString(),
                unitId,
                unitName: sysUnits.find(u => u.id === unitId)?.name || "",
                conversionFactor: 1,
                barcode: null,
                isBase: newUnits.length === 0, // first one is base
                order: newUnits.length,
            })
        }
        
        // Ensure at least one isBase if array not empty
        if (newUnits.length > 0 && !newUnits.some(u => u.isBase)) {
            newUnits[0].isBase = true
            newUnits[0].conversionFactor = 1 // base unit must be 1
        }

        saveProductUnitsList(newUnits)
    }

    const updateProductUnitField = (unitId: string, field: 'conversionFactor' | 'barcode', value: any) => {
        const newUnits = productUnits.map(u => u.unitId === unitId ? { ...u, [field]: value } : u)
        setProductUnitsState(newUnits)
    }

    const saveProductUnitsList = (unitsToSave = productUnits) => {
        startTransition(async () => {
            const res = await setProductUnits(product.id, unitsToSave.map(u => ({ 
                unitId: u.unitId, 
                isBase: u.isBase,
                conversionFactor: u.conversionFactor || 1,
                barcode: u.barcode || undefined
            })))
            if (res.success && res.data) {
                setProductUnitsState((res.data as any).productUnits || [])
                toast.success("تم تحديث وحدات المنتج")
            } else {
                toast.error(res.error || "فشل تحديث الوحدات")
            }
        })
    }

    // Set a unit as the base unit
    const setAsBaseUnit = (unitId: string) => {
        const newUnits = productUnits.map(u => ({
            ...u,
            isBase: u.unitId === unitId,
            conversionFactor: u.unitId === unitId ? 1 : u.conversionFactor
        }))
        saveProductUnitsList(newUnits)
    }

    // ─── PRICING MANAGEMENT ───────────────────────────────────────────

    const comboExists = (labelId: string, curId: string, unId: string) =>
        prices.some(p => p.priceLabelId === labelId && p.currencyId === curId && p.unitId === unId)

    const handleAutoAdd = async () => {
        const val = parseFloat(autoBasePrice)
        if (!autoLabelId) return toast.error("مسمى التسعيرة مطلوب")
        if (!autoCurrencyId) return toast.error("العملة مطلوبة")
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")
        if (productUnits.length === 0) return toast.error("أضف وحدات للمنتج أولاً")

        startTransition(async () => {
            const res = await addProductPricesForAllUnits(product.id, {
                priceLabelId: autoLabelId,
                currencyId: autoCurrencyId,
                basePriceValue: val
            })
            if (res.success && res.data) {
                setPrices((res.data as any).productPrices || [])
                setAutoLabelId("")
                setAutoBasePrice("")
                setIsAddingAuto(false)
                toast.success("تم توليد الأسعار بنجاح")
            } else {
                toast.error(res.error || "فشل إضافة الأسعار")
            }
        })
    }

    const handleSingleAdd = async () => {
        const val = parseFloat(singleValue)
        if (!singleLabelId) return toast.error("مسمى التسعيرة مطلوب")
        if (!singleCurrencyId) return toast.error("العملة مطلوبة")
        if (!singleUnitId) return toast.error("الوحدة مطلوبة")
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")

        startTransition(async () => {
            const res = await addProductPrice(product.id, {
                priceLabelId: singleLabelId,
                currencyId: singleCurrencyId,
                unitId: singleUnitId,
                value: val,
                isAutoCalculated: false
            })
            if (res.success && res.data) {
                setPrices((res.data as any).productPrices || [])
                setSingleLabelId("")
                setSingleValue("")
                setSingleUnitId("")
                setIsAddingSingle(false)
                toast.success("تم إضافة السعر")
            } else {
                toast.error(res.error || "فشل إضافة السعر")
            }
        })
    }

    const handleUpdate = async () => {
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
                setPrices((res.data as any).productPrices || [])
                setEditing(null)
                toast.success("تم تحديث السعر")
            } else {
                toast.error(res.error || "فشل تحديث السعر")
            }
        })
    }

    const handleDelete = async (priceId: string) => {
        startTransition(async () => {
            const res = await deleteProductPrice(priceId)
            if (res.success && res.data) {
                setPrices((res.data as any).productPrices || [])
                toast.success("تم حذف السعر")
            } else {
                toast.error(res.error || "فشل حذف السعر")
            }
        })
    }

    // Group active prices by PriceLabel for display
    const groupedPrices = prices.reduce((acc, p) => {
        if (!acc[p.priceLabelName]) acc[p.priceLabelName] = []
        acc[p.priceLabelName].push(p)
        return acc
    }, {} as Record<string, SerializedPrice[]>)

    return (
        <div className="w-full space-y-6">
            
            {/* 1. UNITS SECTION */}
            <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 bg-linear-to-r from-muted/30 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Scale className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-bold bg-linear-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">وحدات القياس</span>
                            <span className="text-[10px] text-muted-foreground">اختر الوحدات المتاحة لهذا المنتج وقم بتحديد سعة كل منها</span>
                        </div>
                    </div>
                    
                    <Button 
                        size="sm" 
                        onClick={() => saveProductUnitsList()}
                        disabled={isPending || JSON.stringify(productUnits) === JSON.stringify(product.productUnits || [])}
                        className="gap-2 shrink-0 rounded-xl px-4 shadow-sm hover:shadow-md transition-all"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ التغييرات
                    </Button>
                </div>
                
                <div className="p-6 space-y-8">
                    {/* Unit Selection Grid - More Compact */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
                            <Plus className="w-3 h-3" /> اختيار الوحدات المتاحة
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {sysUnits.map(su => {
                                const isSelected = productUnits.some(u => u.unitId === su.id)
                                return (
                                    <button 
                                        key={su.id} 
                                        onClick={() => !isPending && toggleProductUnit(su.id)}
                                        disabled={isPending}
                                        className={`px-4 py-2 rounded-xl border transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                                            isSelected 
                                                ? 'bg-primary/10 border-primary/40 text-primary shadow-xs' 
                                                : 'bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className={`size-2 rounded-full ${isSelected ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-muted-foreground/30'}`} />
                                        {su.name}
                                        {isSelected && <X className="size-3 ml-1 opacity-50 hover:opacity-100" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Selected Units Configuration - Wide Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/20 pb-2">
                            <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
                                <Edit2 className="w-3 h-3" /> تهيئة سعة الوحدات والباركود
                            </h4>
                            {productUnits.length > 0 && (
                                <Badge variant="outline" className="text-[9px] h-4 bg-primary/5 text-primary/70 border-primary/20">
                                    {productUnits.length} وحدات مختارة
                                </Badge>
                            )}
                        </div>
                        
                        {productUnits.length === 0 ? (
                            <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                                <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
                                    <Scale className="h-6 w-6 text-muted-foreground/30" />
                                </div>
                                <p className="text-sm text-muted-foreground">لم يتم اختيار أي وحدات بعد. اختر من القائمة أعلاه للبدء.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border/50 overflow-hidden bg-background/30 backdrop-blur-xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="bg-muted/40 border-b border-border/50">
                                                <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">اسم الوحدة</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">النوع</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">معامل التحويل (الكمية)</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">الباركود (Barcode)</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {productUnits.sort((a, b) => (a.isBase ? -1 : 1)).map((pu) => (
                                                <tr key={pu.unitId} className={`group transition-colors ${pu.isBase ? 'bg-primary/2' : 'hover:bg-muted/20'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-sm ${pu.isBase ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background border border-border/50 text-muted-foreground'}`}>
                                                                {pu.unitName.charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-sm">{pu.unitName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {pu.isBase ? (
                                                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5 px-2 shadow-none">وحدة أساسية</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] h-5 px-2 border-border/50 text-muted-foreground">وحدة مضافة</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center">
                                                            <div className="relative w-24">
                                                                <Input 
                                                                    type="number" 
                                                                    min="1" 
                                                                    disabled={pu.isBase || isPending}
                                                                    value={pu.isBase ? 1 : pu.conversionFactor} 
                                                                    onChange={(e) => updateProductUnitField(pu.unitId, 'conversionFactor', parseInt(e.target.value) || 1)}
                                                                    className={`h-8 text-center font-bold font-mono bg-background/50 border-border/50 focus:border-primary/30 ${pu.isBase ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                />
                                                                {pu.isBase && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="relative group/input max-w-[180px]">
                                                            <Input 
                                                                placeholder="0000000000"
                                                                disabled={isPending}
                                                                value={pu.barcode || ''} 
                                                                onChange={(e) => updateProductUnitField(pu.unitId, 'barcode', e.target.value)}
                                                                className="h-8 font-mono text-xs bg-background/50 border-border/50 focus:border-primary/30 pr-8"
                                                            />
                                                            <Barcode className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40 group-focus-within/input:text-primary/50 transition-colors" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-left">
                                                        {!pu.isBase && (
                                                            <button 
                                                                onClick={() => setAsBaseUnit(pu.unitId)}
                                                                className="text-[10px] font-bold text-primary hover:underline underline-offset-4 decoration-primary/30 transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                تعيين كأساسية
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. PRICING SECTION */}
            <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-border/40 bg-linear-to-r from-muted/30 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Tag className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-bold bg-linear-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">تسعيرات المنتج</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">إدارة قوائم الأسعار والعملات لمختلف الوحدات</span>
                                <Badge variant="secondary" className="text-[10px] font-mono h-4 border-none bg-primary/5 text-primary/70">
                                    {prices.length}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    {(!isAddingAuto && !isAddingSingle) && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-2 rounded-xl border-border/50 bg-background/50 backdrop-blur-xs" onClick={() => setIsAddingSingle(true)} disabled={isPending || productUnits.length === 0}>
                                <Plus className="h-4 w-4" /> تسعيرة مخصصة
                            </Button>
                            <Button size="sm" variant="default" className="gap-2 rounded-xl shadow-sm" onClick={() => setIsAddingAuto(true)} disabled={isPending || productUnits.length === 0}>
                                <Calculator className="h-4 w-4" /> تسعير ذكي
                            </Button>
                        </div>
                    )}
                </div>

                <div className="divide-y divide-border/30">
                    {/* Empty State */}
                    {prices.length === 0 && !isAddingAuto && !isAddingSingle && (
                        <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
                            <div className="size-20 rounded-full bg-linear-to-b from-muted/50 to-muted/10 flex items-center justify-center border border-border/40 shadow-inner">
                                <Tag className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <div className="max-w-xs space-y-1">
                                <p className="text-base font-bold text-foreground">لا توجد أسعار معرفة بعد</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">ابدأ بإضافة تسعيرات مخصصة أو استخدم التسعير الذكي لتوليد الأسعار لجميع الوحدات المختارة آلياً.</p>
                            </div>
                            <Button 
                                size="sm" 
                                variant="default" 
                                className="gap-2 mt-2 rounded-xl" 
                                onClick={() => setIsAddingAuto(true)} 
                                disabled={productUnits.length === 0}
                            >
                                <Calculator className="h-4 w-4" /> تشغيل مساعد التسعير الذكي
                            </Button>
                        </div>
                    )}

                    {/* Auto Pricing Form - Modernized */}
                    {isAddingAuto && (
                        <div className="p-6 bg-linear-to-b from-primary/3 to-transparent border-b border-primary/10 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Calculator className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base">مساعد التسعير الذكي</h3>
                                        <p className="text-[10px] text-muted-foreground">يقوم بحساب أسعار جميع الوحدات بناءً على معامل التحويل (Conversion Factor)</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={() => setIsAddingAuto(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                <div className="md:col-span-3 space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80 mr-1">مسمى القائمة</label>
                                    <Select value={autoLabelId} onValueChange={setAutoLabelId}>
                                        <SelectTrigger className="h-11 rounded-xl bg-background border-border/50"><SelectValue placeholder="اختر القائمة" /></SelectTrigger>
                                        <SelectContent>
                                            {priceLabels.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80 mr-1">العملة</label>
                                    <Select value={autoCurrencyId} onValueChange={setAutoCurrencyId}>
                                        <SelectTrigger className="h-11 rounded-xl bg-background border-border/50"><SelectValue placeholder="اختر العملة" /></SelectTrigger>
                                        <SelectContent>
                                            {currencies.map(c => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80 mr-1 flex items-center justify-between">
                                        <span>سعر الوحدة الأساسية</span>
                                        <Badge variant="outline" className="h-4 text-[9px] px-1 bg-muted/30 border-border/50 text-muted-foreground">{productUnits.find(u => u.isBase)?.unitName || 'لا توجد وحدة'}</Badge>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground/50 text-sm">
                                            {currencies.find(c => c.id === autoCurrencyId)?.symbol || '$'}
                                        </div>
                                        <Input
                                            type="number" step="0.01" min="0" autoFocus
                                            value={autoBasePrice} onChange={(e) => setAutoBasePrice(e.target.value)}
                                            placeholder="0.00"
                                            className="h-11 rounded-xl bg-background border-border/50 pl-14 font-mono font-bold text-lg focus:border-primary/40 focus:ring-0 shadow-xs"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 gap-2" onClick={handleAutoAdd} disabled={isPending || !autoLabelId || !autoCurrencyId || !autoBasePrice}>
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        توليد وحفظ
                                    </Button>
                                </div>
                            </div>
                            
                             {/* Visual Preview Table - Enhanced */}
                             {autoBasePrice && productUnits.length > 0 && (
                                 <div className="mt-8 pt-6 border-t border-dashed border-border/50 animate-in fade-in duration-500">
                                     <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                                         <Eye className="w-3 h-3" /> معاينة الأسعار المقترحة قبل الحفظ
                                     </h4>
                                     <div className="rounded-xl border border-border/30 overflow-hidden bg-background/20">
                                         <table className="w-full text-right border-collapse">
                                             <thead className="bg-muted/30 border-b border-border/30">
                                                 <tr>
                                                     <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">الوحدة</th>
                                                     <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">الكمية</th>
                                                     <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-left">السعر المتوقع</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-border/20">
                                                 {productUnits.map(u => (
                                                     <tr key={u.id} className="hover:bg-primary/1 transition-colors">
                                                         <td className="px-4 py-2.5">
                                                             <span className="text-[11px] font-bold text-foreground">{u.unitName}</span>
                                                         </td>
                                                         <td className="px-4 py-2.5 text-center">
                                                             <span className="text-[10px] font-mono text-muted-foreground">×{u.conversionFactor}</span>
                                                         </td>
                                                         <td className="px-4 py-2.5 text-left">
                                                             <div className="flex items-baseline justify-end gap-1">
                                                                 <span className="text-[9px] font-bold text-muted-foreground/50">{currencies.find(c => c.id === autoCurrencyId)?.symbol}</span>
                                                                 <span className="text-sm font-mono font-bold text-primary">{(parseFloat(autoBasePrice) * u.conversionFactor).toFixed(2)}</span>
                                                             </div>
                                                         </td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}

                    {/* Single Pricing Form - Modernized */}
                    {isAddingSingle && (
                        <div className="p-6 bg-linear-to-b from-muted/5 to-transparent border-b border-border/50 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-muted/10 border border-border/50 flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base">إضافة تسعيرة مخصصة</h3>
                                        <p className="text-[10px] text-muted-foreground">تحديد سعر محدد لوحدة وعملة وقائمة بعينها</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={() => setIsAddingSingle(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80">القائمة</label>
                                    <Select value={singleLabelId} onValueChange={setSingleLabelId}>
                                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50"><SelectValue placeholder="اختر القائمة" /></SelectTrigger>
                                        <SelectContent>
                                            {priceLabels.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80">العملة</label>
                                    <Select value={singleCurrencyId} onValueChange={setSingleCurrencyId}>
                                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50"><SelectValue placeholder="اختر العملة" /></SelectTrigger>
                                        <SelectContent>
                                            {currencies.map(c => <SelectItem key={c.id} value={c.id}>{c.symbol}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80">الوحدة</label>
                                    <Select value={singleUnitId} onValueChange={setSingleUnitId}>
                                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50"><SelectValue placeholder="اختر الوحدة" /></SelectTrigger>
                                        <SelectContent>
                                            {productUnits.map(pu => <SelectItem key={pu.id} value={pu.unitId}>{pu.unitName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground/80">السعر</label>
                                    <Input
                                        type="number" step="0.01" min="0" autoFocus
                                        value={singleValue} onChange={(e) => setSingleValue(e.target.value)}
                                        className="h-10 rounded-xl bg-background border-border/50 font-mono font-bold text-lg"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSingleAdd() }}
                                    />
                                </div>
                            </div>
                            
                            {singleLabelId && singleCurrencyId && singleUnitId && comboExists(singleLabelId, singleCurrencyId, singleUnitId) && (
                                <div className="mt-4 flex items-start gap-2 text-[10px] text-amber-600 bg-amber-50/50 border border-amber-200/50 rounded-xl px-4 py-3">
                                    <span>⚠️</span>
                                    <span>هذه التسعيرة موجودة مسبقاً في هذه القائمة، الحفظ سيؤدي لتكرار السعر لهذه الوحدة والعملة.</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mt-6">
                                <Button size="sm" className="rounded-xl px-6" onClick={handleSingleAdd} disabled={isPending || !singleLabelId || !singleCurrencyId || !singleUnitId || !singleValue}>
                                    {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} حفظ السعر
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingSingle(false)} disabled={isPending}>تجاهل</Button>
                            </div>
                        </div>
                    )}

                    {/* Active Prices Grouped by Label - Wide Table View */}
                    {Object.entries(groupedPrices).map(([labelName, labelPrices]) => (
                        <div key={labelName} className="p-0 border-b border-border/20 last:border-b-0 group/label">
                            <div className="bg-muted/10 px-6 py-3 flex items-center justify-between group-hover/label:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                                    <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{labelName}</span>
                                </div>
                                <Badge variant="outline" className="text-[9px] h-4 bg-background px-1.5 border-border/50 text-muted-foreground">
                                    {labelPrices.length} تسعيرات
                                </Badge>
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
                                                    /* Inline Editing - Full Width Row */
                                                    <td colSpan={5} className="px-6 py-4 bg-primary/3">
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
                                                    /* Normal Row Display */
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
                                                                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary" onClick={() => setEditing({ priceId: p.id, priceLabelId: p.priceLabelId, currencyId: p.currencyId, value: String(p.value), unitId: p.unitId })}>
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
                </div>
            </div>


            {/* Help text - Premium Footer */}
            <div className="mt-12 mb-6 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/40 text-[10px] font-medium text-muted-foreground/60 backdrop-blur-xs">
                    <div className="size-1.5 rounded-full bg-primary/40 animate-pulse" />
                    نظام التسعير العالمي الموحد • ERP Standard Alignment
                </div>
                <p className="text-[11px] text-muted-foreground/50 max-w-sm mx-auto leading-relaxed">
                    يتم مزامنة جميع التغييرات في الوحدات والأسعار فور الحفظ مع قاعدة البيانات المركزية لضمان دقة التقارير وعمليات البيع.
                </p>
            </div>
        </div>
    )
}
