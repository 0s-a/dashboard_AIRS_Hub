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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { addProductPrice, updateProductPrice, deleteProductPrice } from "@/lib/actions/inventory"
import type { SerializedPrice } from "@/lib/actions/inventory"
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
        productPrices: SerializedPrice[]
    }
}

type EditingState = {
    priceId: string
    priceLabelId: string
    currencyId: string
    value: string
    unit: string
    quantity: string
} | null

// ─── Pricing Section ──────────────────────────────────────────────────────────
export function PricingSection({ product }: PricingClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [prices, setPrices] = useState<SerializedPrice[]>(product.productPrices || [])
    const [editing, setEditing] = useState<EditingState>(null)
    const [newPriceLabelId, setNewPriceLabelId] = useState("")
    const [newCurrencyId, setNewCurrencyId] = useState("")
    const [newValue, setNewValue] = useState("")
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
            if (res.success && res.data) {
                setCurrencies(res.data)
                // Set default currency
                const defaultCurrency = res.data.find((c: any) => c.isDefault) || res.data[0]
                if (defaultCurrency && !newCurrencyId) setNewCurrencyId(defaultCurrency.id)
            }
        })
    }, [])

    const handleAdd = async () => {
        const val = parseFloat(newValue)
        if (!newPriceLabelId) return toast.error("مسمى التسعيرة مطلوب")
        if (!newCurrencyId) return toast.error("العملة مطلوبة")
        if (isNaN(val) || val < 0) return toast.error("السعر غير صحيح")

        startTransition(async () => {
            const res = await addProductPrice(product.id, {
                priceLabelId: newPriceLabelId,
                currencyId: newCurrencyId,
                value: val,
                unit: newUnit.trim() || undefined,
                quantity: newQuantity ? parseInt(newQuantity) : undefined,
            })
            if (res.success && res.data) {
                setPrices((res.data as any).productPrices || [])
                setNewPriceLabelId("")
                setNewValue("")
                setNewUnit("")
                setNewQuantity("")
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
                unit: editing.unit.trim() || null,
                quantity: editing.quantity ? parseInt(editing.quantity) : null,
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

    // Group prices by PriceLabel for display
    const groupedPrices = prices.reduce((acc, p) => {
        if (!acc[p.priceLabelName]) acc[p.priceLabelName] = []
        acc[p.priceLabelName].push(p)
        return acc
    }, {} as Record<string, SerializedPrice[]>)

    // Check if a specific (priceLabelId + currencyId) combo already exists
    const comboExists = (priceLabelId: string, currencyId: string) =>
        prices.some(p => p.priceLabelId === priceLabelId && p.currencyId === currencyId)

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

                    {/* Grouped by PriceLabel */}
                    {Object.entries(groupedPrices).map(([labelName, labelPrices]) => (
                        <div key={labelName} className="px-6 py-4">
                            <div className="text-sm font-bold text-foreground mb-3">{labelName}</div>
                            <div className="flex flex-col gap-2">
                                {labelPrices.map((p) => (
                                    <div
                                        key={p.id}
                                        className="relative flex flex-col gap-3 px-4 py-3 rounded-xl border border-border/40 bg-muted/5 group hover:bg-muted/10 transition-colors"
                                    >
                                        {editing?.priceId === p.id ? (
                                            <>
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-muted-foreground">التسمية</label>
                                                        <Select
                                                            value={editing.priceLabelId}
                                                            onValueChange={(val) => setEditing({ ...editing, priceLabelId: val })}
                                                        >
                                                            <SelectTrigger className="h-10 text-sm focus-visible:ring-primary">
                                                                <SelectValue placeholder="اختر مسمى التسعيرة" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {priceLabels.map((pl) => (
                                                                    <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-muted-foreground">العملة</label>
                                                        <Select
                                                            value={editing.currencyId}
                                                            onValueChange={(val) => setEditing({ ...editing, currencyId: val })}
                                                        >
                                                            <SelectTrigger className="h-10 text-sm focus-visible:ring-primary">
                                                                <SelectValue placeholder="اختر العملة" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {currencies.map(c => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        {c.symbol} — {c.name}
                                                                    </SelectItem>
                                                                ))}
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
                                                            className="h-10 text-sm font-semibold focus-visible:ring-primary"
                                                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-muted-foreground">الوحدة (اختياري)</label>
                                                        <Input
                                                            value={editing.unit}
                                                            onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                                                            placeholder="حبة، كرتون..."
                                                            className="h-10 text-sm focus-visible:ring-primary"
                                                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-muted-foreground">العدد (اختياري)</label>
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="1"
                                                            value={editing.quantity}
                                                            onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                                                            placeholder="العدد"
                                                            className="h-10 text-sm focus-visible:ring-primary"
                                                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="h-10 px-5 rounded-xl text-sm w-full sm:w-auto"
                                                        onClick={handleUpdate}
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                                        تحديث السعر
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted"
                                                        onClick={() => setEditing(null)}
                                                        disabled={isPending}
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col gap-0.5">
                                                    {p.unit && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {p.unit} {p.quantity ? `(×${p.quantity})` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-baseline gap-1.5 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                                        <span className="font-mono font-bold tabular-nums text-lg text-primary">
                                                            {Number(p.value).toFixed(2)}
                                                        </span>
                                                        <span className="text-xs font-semibold text-muted-foreground">{p.currencySymbol}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <TooltipProvider delayDuration={0}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                                        onClick={() => setEditing({
                                                                            priceId: p.id,
                                                                            priceLabelId: p.priceLabelId,
                                                                            currencyId: p.currencyId,
                                                                            value: String(p.value),
                                                                            unit: p.unit || '',
                                                                            quantity: p.quantity ? String(p.quantity) : '',
                                                                        })}
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5" />
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
                                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                disabled={isPending}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>حذف</TooltipContent>
                                                                </Tooltip>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>حذف التسعيرة؟</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            سيتم حذف تسعيرة &quot;{p.priceLabelName}&quot; ({Number(p.value).toFixed(2)} {p.currencySymbol}) نهائياً.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter className="gap-2 sm:gap-0">
                                                                        <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(p.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                                                        >
                                                                            تأكيد الحذف
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Add new price row */}
                    {isAdding && (
                        <div className="flex flex-col gap-5 px-6 py-6 bg-muted/5 border-t-2 border-dashed border-border animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">التسمية</label>
                                    <Select
                                        value={newPriceLabelId}
                                        onValueChange={(val) => setNewPriceLabelId(val)}
                                    >
                                        <SelectTrigger className="h-11 text-base focus-visible:ring-primary">
                                            <SelectValue placeholder="اختر مسمى التسعيرة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priceLabels.length === 0 ? (
                                                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                    لا توجد مسميات. أضف من صفحة مسميات التسعيرات.
                                                </div>
                                            ) : (
                                                priceLabels.map((pl) => (
                                                    <SelectItem key={pl.id} value={pl.id}>
                                                        {pl.name}
                                                        {newCurrencyId && comboExists(pl.id, newCurrencyId) ? ' ✓' : ''}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">العملة</label>
                                    <Select
                                        value={newCurrencyId}
                                        onValueChange={(val) => setNewCurrencyId(val)}
                                    >
                                        <SelectTrigger className="h-11 text-base focus-visible:ring-primary">
                                            <SelectValue placeholder="اختر العملة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.length === 0 ? (
                                                <div className="px-2 py-4 text-xs text-muted-foreground text-center">لا توجد عملات. أضف من صفحة العملات.</div>
                                            ) : currencies.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.symbol} — {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">السعر</label>
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
                                    <label className="text-sm font-medium text-muted-foreground">الوحدة (اختياري)</label>
                                    <Input
                                        value={newUnit}
                                        onChange={(e) => setNewUnit(e.target.value)}
                                        placeholder="حبة، كرتون..."
                                        className="h-11 text-base focus-visible:ring-primary"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">العدد (اختياري)</label>
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
                            </div>
                            {newPriceLabelId && newCurrencyId && comboExists(newPriceLabelId, newCurrencyId) && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    ⚠️ هذا المسمى مع هذه العملة موجود بالفعل. اختر عملة أخرى أو مسمى آخر.
                                </p>
                            )}
                            <div className="flex items-center gap-3 shrink-0 mt-2">
                                <Button
                                    size="sm"
                                    className="h-11 px-8 text-base rounded-xl w-full sm:w-auto"
                                    onClick={handleAdd}
                                    disabled={isPending || !newPriceLabelId || !newCurrencyId || !newValue || comboExists(newPriceLabelId, newCurrencyId)}
                                >
                                    {isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                                    حفظ التسعيرة المضافة
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-muted"
                                    onClick={() => { setIsAdding(false); setNewPriceLabelId(""); setNewValue(""); setNewUnit(""); setNewQuantity("") }}
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
