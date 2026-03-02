"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Tag,
    ChevronRight,
    Loader2,
    ArrowRight,
    Tags,
    ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { addPrice, updatePrice, deletePrice } from "@/lib/actions/inventory"
import type { PriceEntry } from "@/lib/actions/inventory"
import { getPriceLabels } from "@/lib/actions/price-labels"
import { getActiveCurrencies } from "@/lib/actions/currencies"
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

type PricingClientProps = {
    product: {
        id: string
        itemNumber: string
        name: string
        prices: PriceEntry[] | null
    }
}

type EditingState = { index: number; label: string; value: string; currency: string; unit?: string; quantity?: number } | null

// Removed LabelCombobox

// ─── Pricing Section ──────────────────────────────────────────────────────────
export function PricingSection({ product }: PricingClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [prices, setPrices] = useState<PriceEntry[]>(product.prices || [])
    const [editing, setEditing] = useState<EditingState>(null)
    const [newLabel, setNewLabel] = useState("")
    const [newValue, setNewValue] = useState("")
    const [newCurrency, setNewCurrency] = useState("ر.ي")
    const [newUnit, setNewUnit] = useState("")
    const [newQuantity, setNewQuantity] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [priceLabels, setPriceLabels] = useState<{ id: string; name: string }[]>([])
    const [currencies, setCurrencies] = useState<{ id: string; name: string; symbol: string }[]>([])

    useEffect(() => {
        getPriceLabels().then((res) => {
            if (res.success && res.data) setPriceLabels(res.data)
        })
        getActiveCurrencies().then((res) => {
            if (res.success && res.data) setCurrencies(res.data)
        })
    }, [])


    const handleAdd = async () => {
        const val = parseFloat(newValue)
        if (!newLabel.trim()) return toast.error("التسمية مطلوبة")
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")

        startTransition(async () => {
            const res = await addPrice(product.id, { 
                label: newLabel.trim(), 
                value: val, 
                currency: newCurrency.trim() || "ر.ي",
                unit: newUnit.trim() || undefined,
                quantity: newQuantity ? parseInt(newQuantity) : undefined 
            })
            if (res.success && res.data) {
                setPrices((res.data as any).prices || [])
                setNewLabel("")
                setNewValue("")
                setNewCurrency("ر.ي")
                setNewUnit("")
                setNewQuantity("")
                // Don't close the add form to allow fast continuous additions
                toast.success("تم إضافة السعر")
            } else {
                toast.error(res.error || "فشل إضافة السعر")
            }
        })
    }

    const handleUpdate = async () => {
        if (!editing) return
        const val = parseFloat(editing.value)
        if (!editing.label.trim()) return toast.error("التسمية مطلوبة")
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")

        startTransition(async () => {
            const res = await updatePrice(product.id, editing.index, {
                label: editing.label.trim(),
                value: val,
                currency: editing.currency.trim() || 'ر.ي',
                unit: editing.unit?.trim() || undefined,
                quantity: editing.quantity || undefined
            })
            if (res.success && res.data) {
                setPrices((res.data as any).prices || [])
                setEditing(null)
                toast.success("تم تحديث السعر")
            } else {
                toast.error(res.error || "فشل تحديث السعر")
            }
        })
    }

    const handleDelete = async (index: number) => {
        startTransition(async () => {
            const res = await deletePrice(product.id, index)
            if (res.success && res.data) {
                setPrices((res.data as any).prices || [])
                toast.success("تم حذف السعر")
            } else {
                toast.error(res.error || "فشل حذف السعر")
            }
        })
    }
    return (
        <div className="w-full">
            {/* Prices Card */}
            <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/40 bg-muted/10">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                            {prices.length} {prices.length === 1 ? "سعر" : "أسعار"}
                        </Badge>
                        <span className="text-sm font-medium">قائمة الأسعار المسجلة للمنتج</span>
                    </div>
                    {!isAdding && (
                        <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsAdding(true)}
                            disabled={isPending}
                        >
                            <Plus className="h-4 w-4" />
                            إضافة سعر
                        </Button>
                    )}
                </div>
                {/* Price List */}
                <div className="divide-y divide-border/30">
                    {prices.length === 0 && !isAdding && (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <div className="size-14 rounded-full bg-muted/40 flex items-center justify-center">
                                <Tag className="h-7 w-7 text-muted-foreground/40" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">لا توجد أسعار محددة</p>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">أضف سعر المفرد، الجملة، أو أي تسعيرة مخصصة</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 mt-2"
                                onClick={() => setIsAdding(true)}
                            >
                                <Plus className="h-4 w-4" />
                                إضافة أول سعر
                            </Button>
                        </div>
                    )}

                    {prices.map((p, index) => (
                        <div
                            key={index}
                            className="relative flex flex-col gap-4 px-6 py-5 group hover:bg-muted/10 transition-colors"
                        >
                            {editing?.index === index ? (
                                <>
                                    <div className="flex-1 grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-muted-foreground">التسمية</label>
                                            <Select
                                                value={editing.label}
                                                onValueChange={(val) => setEditing({ ...editing, label: val })}
                                            >
                                                <SelectTrigger className="h-11 text-base focus-visible:ring-primary">
                                                    <SelectValue placeholder="اختر مسمى التسعيرة" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {priceLabels.filter(pl => pl.name === editing.label || !prices.some(p => p.label === pl.name)).length === 0 ? (
                                                        <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                            لا توجد مسميات متاحة.
                                                        </div>
                                                    ) : (
                                                        priceLabels
                                                            .filter(pl => pl.name === editing.label || !prices.some(p => p.label === pl.name))
                                                            .map((pl) => (
                                                                <SelectItem key={pl.id} value={pl.name}>
                                                                    {pl.name}
                                                                </SelectItem>
                                                            ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-muted-foreground">السعر</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={editing.value}
                                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                                placeholder="السعر"
                                                className="h-11 text-base font-semibold focus-visible:ring-primary"
                                                onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-muted-foreground">الوحدة (اختياري)</label>
                                            <Input
                                                value={editing.unit || ''}
                                                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                                                placeholder="الوحدة (اختياري)"
                                                className="h-11 text-base focus-visible:ring-primary"
                                                onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-muted-foreground">العدد (اختياري)</label>
                                            <Input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={editing.quantity || ''}
                                                onChange={(e) => setEditing({ ...editing, quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                                                placeholder="العدد (اختياري)"
                                                className="h-11 text-base focus-visible:ring-primary"
                                                onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-muted-foreground">العملة</label>
                                            <Select
                                                value={editing.currency}
                                                onValueChange={(val) => setEditing({ ...editing, currency: val })}
                                            >
                                                <SelectTrigger className="h-11 text-base focus-visible:ring-primary">
                                                    <SelectValue placeholder="اختر العملة" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {currencies.length === 0 ? (
                                                        <div className="px-2 py-4 text-xs text-muted-foreground text-center">لا توجد عملات. أضف من صفحة العملات.</div>
                                                    ) : currencies.map(c => (
                                                        <SelectItem key={c.id} value={c.symbol}>
                                                            {c.symbol} — {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-11 px-6 rounded-xl text-base w-full sm:w-auto"
                                            onClick={handleUpdate}
                                            disabled={isPending}
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                            تحديث السعر
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-muted"
                                            onClick={() => setEditing(null)}
                                            disabled={isPending}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-1 min-w-0">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-base font-semibold">{p.label}</span>
                                            {p.unit && (
                                                <span className="text-sm text-muted-foreground">
                                                    {p.unit} {p.quantity ? `(×${p.quantity})` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 bg-muted/30 p-3 rounded-xl border border-border/50">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="font-mono font-bold tabular-nums text-xl text-primary">
                                                    {Number(p.value).toFixed(2)}
                                                </span>
                                                <span className="text-sm font-semibold text-muted-foreground">{p.currency || "ر.ي"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-4 left-4 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => setEditing({ index, label: p.label, value: String(p.value), currency: p.currency || "ر.ي", unit: p.unit, quantity: p.quantity })}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>تعديل</TooltipContent>
                                            </Tooltip>
                                            <AlertDialog>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                disabled={isPending}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>حذف</TooltipContent>
                                                </Tooltip>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>حذف التسعيرة؟</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            سيتم حذف تسعيرة &quot;{p.label}&quot; ({Number(p.value).toFixed(2)} ر.ي) نهائياً.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="gap-2 sm:gap-0">
                                                        <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(index)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                                        >
                                                            تأكيد الحذف
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TooltipProvider>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {/* Add new price row */}
                    {isAdding && (
                        <div className="flex flex-col gap-5 px-6 py-6 bg-muted/5 border-t-2 border-dashed border-border animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex-1 grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">التسمية</label>
                                    <Select
                                        value={newLabel}
                                        onValueChange={(val) => setNewLabel(val)}
                                    >
                                        <SelectTrigger className="h-11 text-base focus-visible:ring-primary">
                                            <SelectValue placeholder="اختر مسمى التسعيرة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priceLabels.filter(pl => !prices.some(p => p.label === pl.name)).length === 0 ? (
                                                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                    {priceLabels.length === 0 ? 'لا توجد مسميات. أضف من صفحة مسميات التسعيرات.' : 'جميع المسميات مستخدمة بالفعل.'}
                                                </div>
                                            ) : (
                                                priceLabels
                                                    .filter(pl => !prices.some(p => p.label === pl.name))
                                                    .map((pl) => (
                                                        <SelectItem key={pl.id} value={pl.name}>
                                                            {pl.name}
                                                        </SelectItem>
                                                    ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">السعر (ر.ي)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        placeholder="0.00"
                                        className="h-11 text-base font-semibold focus-visible:ring-primary"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">الوحدة</label>
                                    <Input
                                        value={newUnit}
                                        onChange={(e) => setNewUnit(e.target.value)}
                                        placeholder="حبة، كرتون..."
                                        className="h-11 text-base focus-visible:ring-primary"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">العدد</label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={newQuantity}
                                        onChange={(e) => setNewQuantity(e.target.value)}
                                        placeholder="1"
                                        className="h-11 text-base focus-visible:ring-primary"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">العملة</label>
                                    <Select
                                        value={newCurrency}
                                        onValueChange={(val) => setNewCurrency(val)}
                                    >
                                        <SelectTrigger className="h-11 text-base focus-visible:ring-primary">
                                            <SelectValue placeholder="اختر العملة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.length === 0 ? (
                                                <div className="px-2 py-4 text-xs text-muted-foreground text-center">لا توجد عملات. أضف من صفحة العملات.</div>
                                            ) : currencies.map(c => (
                                                <SelectItem key={c.id} value={c.symbol}>
                                                    {c.symbol} — {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 mt-2">
                                <Button
                                    size="sm"
                                    className="h-11 px-8 text-base rounded-xl w-full sm:w-auto"
                                    onClick={handleAdd}
                                    disabled={isPending || !newLabel.trim() || !newValue}
                                >
                                    {isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                                    حفظ التسعيرة المضافة
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-muted"
                                    onClick={() => { setIsAdding(false); setNewLabel(""); setNewValue("") }}
                                    disabled={isPending}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Help text */}
            <p className="text-xs text-muted-foreground text-center mt-6">
                يمكنك{" "}
                <Link href="/price-labels" className="text-primary hover:underline underline-offset-4">
                    إدارة المسميات المحفوظة
                </Link>
                {" "}من القائمة الجانبية لتسهيل الإدخال السريع.
            </p>
        </div>
    )
}
