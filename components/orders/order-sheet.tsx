"use client"

import { useState, useTransition, useCallback, useEffect } from "react"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Plus, Trash2, ShoppingCart, Loader2, PackagePlus, Hash,
    User, StickyNote, Palette, Check, ChevronsUpDown, Search as SearchIcon
} from "lucide-react"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createOrder, updateOrder, getProductPriceLabels, getProductVariants } from "@/lib/actions/orders"
import { ORDER_STATUSES } from "./order-columns"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface VariantOption {
    id: string
    name: string
    type: string
    hex: string | null
    suffix: string
}

interface PriceLabelOption {
    priceLabelId: string
    priceLabelName: string
    value: number
    currencySymbol: string
}

interface OrderItemRow {
    productId: string
    priceLabelId: string
    variantId: string
    quantity: number
    notes: string
    // resolved from server:
    unitPrice?: number
    currencySymbol?: string
    availablePriceLabels: PriceLabelOption[]
    availableVariants: VariantOption[]
    loadingPrices: boolean
    loadingVariants: boolean
}

interface Props {
    mode?: "create" | "edit"
    order?: any
    persons: any[]
    products: any[]
    trigger?: React.ReactNode
}

// ──────────────────────────────────────────────────────────
// Helper: build initial item from edit data
// ──────────────────────────────────────────────────────────

function buildEditItem(it: any): OrderItemRow {
    return {
        productId: it.productId ?? "",
        priceLabelId: it.priceLabelId ?? "",
        variantId: it.variantId ?? "",
        quantity: it.quantity ?? 1,
        notes: it.notes ?? "",
        unitPrice: it.unitPrice,
        currencySymbol: it.currency?.symbol ?? "",
        availablePriceLabels: [],
        availableVariants: [],
        loadingPrices: false,
        loadingVariants: false,
    }
}

function emptyItem(): OrderItemRow {
    return {
        productId: "", priceLabelId: "", variantId: "", quantity: 1, notes: "",
        availablePriceLabels: [], availableVariants: [],
        loadingPrices: false, loadingVariants: false,
    }
}

// ──────────────────────────────────────────────────────────
// Product Combobox Component
// ──────────────────────────────────────────────────────────

function ProductCombobox({ products, value, onChange, disabled }: {
    products: any[],
    value: string,
    onChange: (val: string) => void,
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)

    const selectedProduct = products.find((p) => p.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between rounded-xl h-10 text-sm font-normal bg-muted/20 hover:bg-muted/30 border-dashed hover:border-primary/50 transition-all group"
                    disabled={disabled}
                >
                    {selectedProduct ? (
                        <div className="flex items-center gap-2 truncate">
                            <PackagePlus className="size-4 text-primary/70" />
                            <span className="truncate font-medium">{selectedProduct.name}</span>
                            {selectedProduct.itemNumber && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-background border px-1.5 py-0.5 rounded shrink-0">
                                    #{selectedProduct.itemNumber}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <SearchIcon className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            <span>ابحث عن المنتج...</span>
                        </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="ابحث عن منتج بالاسم أو الرقم..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>لم يتم العثور على منتجات.</CommandEmpty>
                        <CommandGroup>
                            {products.map((p) => (
                                <CommandItem
                                    key={p.id}
                                    value={`${p.name} ${p.itemNumber || ""}`}
                                    onSelect={() => {
                                        onChange(p.id)
                                        setOpen(false)
                                    }}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{p.name}</span>
                                        {p.itemNumber && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                #{p.itemNumber}
                                            </span>
                                        )}
                                    </div>
                                    <Check
                                        className={cn(
                                            "h-4 w-4 text-primary",
                                            value === p.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export function OrderSheet({ mode = "create", order, persons, products, trigger }: Props) {
    const isEdit = mode === "edit"
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Form state
    const [personId, setPersonId] = useState<string>(order?.personId ?? "")
    const [notes, setNotes] = useState(order?.notes ?? "")
    const [status, setStatus] = useState(order?.status ?? "pending")
    const [items, setItems] = useState<OrderItemRow[]>(
        isEdit && order?.items?.length
            ? order.items.map(buildEditItem)
            : []
    )

    // ── Auto-update items when person changes ──
    useEffect(() => {
        if (!personId || personId === "none" || isEdit) return // Don't auto-update if editing existing order (unless requested)
        const selectedPerson = persons.find(p => p.id === personId)
        if (!selectedPerson?.priceLabels?.length) return

        const personLabelIds = selectedPerson.priceLabels.map((pl: any) => pl.priceLabelId)

        setItems(prev => prev.map(item => {
            if (item.productId && (!item.priceLabelId || item.priceLabelId === "") && item.availablePriceLabels.length > 0) {
                const match = item.availablePriceLabels.find(l => personLabelIds.includes(l.priceLabelId))
                if (match) {
                    return {
                        ...item,
                        priceLabelId: match.priceLabelId,
                        unitPrice: match.value,
                        currencySymbol: match.currencySymbol
                    }
                }
            }
            return item
        }))
    }, [personId, persons])

    // ── Reset on open ──
    function handleOpenChange(val: boolean) {
        setOpen(val)
        if (!val) return
        setPersonId(order?.personId ?? "")
        setNotes(order?.notes ?? "")
        setStatus(order?.status ?? "pending")
        setItems(
            isEdit && order?.items?.length
                ? order.items.map(buildEditItem)
                : []
        )
    }

    // ── Keyboard Shortcuts ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key === "n") {
                e.preventDefault()
                addItem()
            }
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault()
                handleSubmit()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [items, personId, notes, status]) // Dependencies for handleSubmit

    // ── Item helpers ──
    function addItem() {
        setItems(prev => [...prev, emptyItem()])
        // Small delay to allow render then focus might be needed, 
        // but since it's a new item at the end, we'll let the user click search.
        toast.info("تم إضافة بند جديد (يمكنك الضغط على 'اختر المنتج')")
    }

    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    function updateItem(idx: number, patch: Partial<OrderItemRow>) {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
    }

    // When product changes → load price labels + variants
    const onProductChange = useCallback(async (idx: number, productId: string) => {
        // Prevent duplicate items (same product + variant)
        const exists = items.find((it, i) => i !== idx && it.productId === productId && it.variantId === "")
        if (exists) {
            toast.info("هذا المنتج موجود بالفعل في الطلب، تم تكراره")
        }

        updateItem(idx, {
            productId,
            priceLabelId: "",
            variantId: "",
            unitPrice: undefined,
            currencySymbol: "",
            loadingPrices: true,
            loadingVariants: true,
            availablePriceLabels: [],
            availableVariants: [],
        })

        const [pricesRes, variantsRes] = await Promise.all([
            getProductPriceLabels(productId),
            getProductVariants(productId),
        ])

        const labels: PriceLabelOption[] = pricesRes.success && pricesRes.data
            ? pricesRes.data.map((pp: any) => ({
                priceLabelId: pp.priceLabelId,
                priceLabelName: pp.priceLabel?.name ?? "—",
                value: pp.value,
                currencySymbol: pp.currency?.symbol ?? "",
            }))
            : []

        // ── Auto-select price label based on person ──
        let autoPriceLabelId = ""
        let autoUnitPrice = undefined
        let autoCurrencySymbol = ""

        if (personId && personId !== "none") {
            const selectedPerson = persons.find(p => p.id === personId)
            if (selectedPerson?.priceLabels?.length > 0) {
                // Find first matching price label from person's allowed labels
                const personLabelIds = selectedPerson.priceLabels.map((pl: any) => pl.priceLabelId)
                const match = labels.find(l => personLabelIds.includes(l.priceLabelId))
                if (match) {
                    autoPriceLabelId = match.priceLabelId
                    autoUnitPrice = match.value
                    autoCurrencySymbol = match.currencySymbol
                }
            }
        }

        const variants: VariantOption[] = variantsRes.success && variantsRes.data
            ? variantsRes.data.map((v: any) => ({
                id: v.id,
                name: v.name,
                type: v.type,
                hex: v.hex,
                suffix: v.suffix,
            }))
            : []

        updateItem(idx, {
            priceLabelId: autoPriceLabelId,
            unitPrice: autoUnitPrice,
            currencySymbol: autoCurrencySymbol,
            availablePriceLabels: labels,
            availableVariants: variants,
            loadingPrices: false,
            loadingVariants: false,
        })
    }, [personId, persons, items]) // Added dependencies

    // When priceLabel changes → set unit price preview
    function onPriceLabelChange(idx: number, priceLabelId: string) {
        const item = items[idx]
        const pl = item.availablePriceLabels.find(p => p.priceLabelId === priceLabelId)
        updateItem(idx, {
            priceLabelId,
            unitPrice: pl?.value,
            currencySymbol: pl?.currencySymbol ?? "",
        })
    }

    // ── Computed total ──
    const total = items.reduce((sum, it) => {
        if (it.unitPrice && it.quantity) return sum + it.unitPrice * it.quantity
        return sum
    }, 0)

    const firstCurrencySymbol = items.find(it => it.currencySymbol)?.currencySymbol ?? ""

    // ── Submit ──
    async function handleSubmit(keepOpen = false) {
        const validItems = items.filter(it => it.productId && it.priceLabelId && it.quantity > 0)
        if (validItems.length === 0) {
            toast.error("أضف منتجاً واحداً على الأقل مع تسعيرة")
            return
        }

        const payload = {
            personId: personId && personId !== "none" ? personId : null,
            notes: notes || null,
            items: validItems.map(it => ({
                productId: it.productId,
                priceLabelId: it.priceLabelId,
                variantId: it.variantId || null,
                quantity: it.quantity,
                notes: it.notes || null,
            })),
        }

        startTransition(async () => {
            let res
            if (isEdit) {
                res = await updateOrder(order.id, { ...payload, status })
            } else {
                res = await createOrder(payload)
            }

            if (res.success) {
                toast.success(isEdit ? "تم تحديث الطلب بنجاح" : "تم إنشاء الطلب بنجاح")
                
                if (keepOpen) {
                    // Reset everything to start a fresh order
                    setPersonId("none")
                    setNotes("")
                    setStatus("pending")
                    setItems([])
                    toast.info("جاهز لإدخال طلب جديد")
                } else {
                    setOpen(false)
                }
            } else {
                toast.error(res.error ?? "حدث خطأ غير متوقع")
            }
        })
    }

    // ── item count & product name for section label ──
    function getProductName(productId: string) {
        return products.find(p => p.id === productId)?.name ?? ""
    }

    // ──────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {trigger ?? (
                    <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20 font-semibold" id="new-order-btn">
                        <ShoppingCart className="size-4" />
                        طلب جديد
                    </Button>
                )}
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-full sm:max-w-2xl p-0 flex flex-col"
                dir="rtl"
            >
                {/* ─── Header ─── */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b bg-linear-to-l from-primary/5 to-transparent">
                    <SheetTitle className="text-xl font-bold flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/30">
                            <ShoppingCart className="size-5" />
                        </div>
                        <div className="flex flex-col">
                            <span>{isEdit ? `تعديل الطلب` : "إنشاء طلب جديد"}</span>
                            {isEdit && (
                                <span className="text-xs font-mono text-muted-foreground font-normal">
                                    #{order?.orderNumber}
                                </span>
                            )}
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-5">
                    <div className="space-y-6">

                        {/* ─── Basic Info Section ─── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                <User className="size-3.5" />
                                معلومات أساسية
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Person */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">الشخص <span className="text-muted-foreground font-normal">(اختياري)</span></Label>
                                    <Select value={personId} onValueChange={setPersonId}>
                                        <SelectTrigger className="rounded-xl h-10" id="order-person-select">
                                            <SelectValue placeholder="اختر شخصاً..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— بدون —</SelectItem>
                                            {persons.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status (edit only) */}
                                {isEdit && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">الحالة</Label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="rounded-xl h-10" id="order-status-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ORDER_STATUSES.map(s => {
                                                    const Icon = s.icon
                                                    return (
                                                        <SelectItem key={s.value} value={s.value}>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="size-3.5" />
                                                                <span>{s.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <StickyNote className="size-3" />
                                    ملاحظات
                                </Label>
                                <Textarea
                                    id="order-notes"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="ملاحظات إضافية على الطلب..."
                                    className="rounded-xl resize-none text-sm"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <Separator className="my-2" />

                        {/* ─── Items Section ─── */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <PackagePlus className="size-4 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-sm">بنود الطلب</h3>
                                    {items.length > 0 && (
                                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            {items.length}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl gap-1.5 border-dashed border-primary/30 text-primary hover:bg-primary/5 text-xs h-8 px-3"
                                    onClick={addItem}
                                    id="add-order-item-btn"
                                >
                                    <Plus className="size-3.5" />
                                    إضافة (Alt+N)
                                </Button>
                            </div>

                            {/* Empty state */}
                            {items.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/30">
                                    <div className="size-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
                                        <ShoppingCart className="size-7 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">لا توجد منتجات بعد</p>
                                    <p className="text-xs mt-1 text-muted-foreground/70">اضغط &quot;إضافة منتج&quot; للبدء</p>
                                </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="relative rounded-2xl border bg-card/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {/* Item Header */}
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
                                            <div className="flex items-center gap-2">
                                                <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    {item.productId ? getProductName(item.productId) : "منتج جديد"}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                onClick={() => removeItem(idx)}
                                            >
                                                <Trash2 className="size-3" />
                                            </Button>
                                        </div>

                                        <div className="p-3 space-y-3">
                                            {/* Product + Price Label Row */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground/70">المنتج</Label>
                                                    <ProductCombobox
                                                        products={products}
                                                        value={item.productId}
                                                        onChange={val => onProductChange(idx, val)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground/70">التسعيرة</Label>
                                                    <Select
                                                        value={item.priceLabelId}
                                                        onValueChange={val => onPriceLabelChange(idx, val)}
                                                        disabled={!item.productId || item.loadingPrices}
                                                    >
                                                        <SelectTrigger className="rounded-xl h-9 text-xs" id={`order-item-${idx}-price-label`}>
                                                            {item.loadingPrices
                                                                ? <span className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                                                    <Loader2 className="size-3 animate-spin" />تحميل...
                                                                </span>
                                                                : <SelectValue placeholder={item.productId ? "اختر التسعيرة..." : "المنتج أولاً"} />
                                                            }
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {item.availablePriceLabels.map(pl => (
                                                                <SelectItem key={pl.priceLabelId} value={pl.priceLabelId}>
                                                                    <div className="flex items-center gap-2 w-full text-xs">
                                                                        <span>{pl.priceLabelName}</span>
                                                                        <span className="font-mono font-bold text-primary mr-auto">
                                                                            {pl.value.toLocaleString("ar-YE")} {pl.currencySymbol}
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Variant Row (if exists) */}
                                            {item.productId && !item.loadingVariants && item.availableVariants.length > 0 && (
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground/70 flex items-center gap-1">
                                                        <Palette className="size-3" />
                                                        اللون / المتغيّر
                                                    </Label>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.availableVariants.map(v => {
                                                            const isSelected = item.variantId === v.id
                                                            const isColor = v.type === "color" && v.hex
                                                            return (
                                                                <button
                                                                    key={v.id}
                                                                    type="button"
                                                                    onClick={() => updateItem(idx, {
                                                                        variantId: isSelected ? "" : v.id
                                                                    })}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all",
                                                                        isSelected
                                                                            ? "border-primary bg-primary text-white"
                                                                            : "border-border bg-muted/20 hover:bg-muted text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {isColor && (
                                                                        <span
                                                                            className="size-2.5 rounded-full border border-white/20"
                                                                            style={{ backgroundColor: v.hex! }}
                                                                        />
                                                                    )}
                                                                    <span>{v.name}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Qty + Total Row */}
                                            <div className="flex items-end gap-3 pt-1">
                                                <div className="space-y-1 flex-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground/70">الكمية</Label>
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg shrink-0"
                                                            onClick={() => updateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <span className="text-base font-bold">−</span>
                                                        </Button>
                                                        <Input
                                                            id={`order-item-${idx}-qty`}
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                                            className="rounded-lg font-mono text-center h-8 text-xs w-16"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg shrink-0"
                                                            onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}
                                                        >
                                                            <span className="text-base font-bold">+</span>
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-0.5 pb-0.5">
                                                    {item.unitPrice != null && (
                                                        <span className="text-[9px] text-muted-foreground font-mono">
                                                            {item.unitPrice.toLocaleString("ar-YE")} {item.currencySymbol}
                                                        </span>
                                                    )}
                                                    <div className="font-mono text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                                                        {((item.unitPrice || 0) * item.quantity).toLocaleString("ar-YE")} {item.currencySymbol}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Note */}
                                            <Input
                                                id={`order-item-${idx}-notes`}
                                                value={item.notes}
                                                onChange={e => updateItem(idx, { notes: e.target.value })}
                                                placeholder="ملاحظة سريعة..."
                                                className="rounded-lg text-[10px] h-7 bg-muted/20 border-dashed border-muted-foreground/20"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ─── Grand Total ─── */}
                        {items.length > 0 && (
                            <div className="rounded-2xl bg-linear-to-l from-primary/10 to-indigo-500/5 border border-primary/20 p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الإجمالي الكلي</span>
                                        <span className="text-[10px] text-muted-foreground/60">
                                            {items.filter(it => it.productId && it.priceLabelId).length} منتج
                                        </span>
                                    </div>
                                    <div className="text-left">
                                        <span className="font-mono text-3xl font-bold text-primary tracking-tight">
                                            {total.toLocaleString("ar-YE")}
                                        </span>
                                        {firstCurrencySymbol && (
                                            <span className="text-sm font-semibold text-primary/70 mr-1.5">
                                                {firstCurrencySymbol}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* ─── Footer ─── */}
                <SheetFooter className="px-6 py-4 border-t bg-muted/20 flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-1 gap-2">
                        <Button
                            className="flex-1 rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20 h-11"
                            onClick={() => handleSubmit(false)}
                            disabled={isPending || items.length === 0}
                            id="order-submit-btn"
                        >
                            {isPending
                                ? <><Loader2 className="size-4 animate-spin" />جاري الحفظ...</>
                                : <><ShoppingCart className="size-4" />{isEdit ? "حفظ التعديلات" : "إنشاء (Ctrl+Enter)"}</>
                            }
                        </Button>
                        {!isEdit && (
                            <Button
                                variant="secondary"
                                className="flex-1 rounded-xl gap-2 font-semibold h-11 border border-primary/10"
                                onClick={() => handleSubmit(true)}
                                disabled={isPending || items.length === 0}
                            >
                                حفظ وإضافة آخر
                            </Button>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        className="rounded-xl h-11"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                    >
                        إلغاء
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
