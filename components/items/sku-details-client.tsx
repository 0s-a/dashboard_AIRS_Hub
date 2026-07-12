"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
    ChevronRight,
    Package,
    Palette,
    Plus,
    Loader2,
    Pencil,
    Trash2,
    Scale,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageGalleryUpload } from "@/components/ui/image-gallery-upload"
import { PriceListPanel } from "@/components/inventory/pricing/price-list-panel"
import { SkcEditSheet } from "@/components/items/skc-edit-sheet"
import { useProductPricing } from "@/hooks/use-product-pricing"
import { addSKU, removeSKU, toggleSkuAvailability, updateSKU } from "@/lib/actions/sku"
import { toggleSkcAvailability, removeSKC } from "@/lib/actions/skc"
import { getProductAttributes } from "@/lib/actions/product-attributes"
import type { SerializedSKUDetail } from "@/lib/types/skc"
import type { ProductAttribute } from "@prisma/client"
import { resolveSkcAttributeEntries } from "@/lib/utils/skc-attributes"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

function SkuEditSheet({ sku, onUpdated }: { sku: SerializedSKUDetail; onUpdated: () => void }) {
    const [sizeLabel, setSizeLabel] = useState(sku.sizeLabel ?? "")
    const [isPending, startTransition] = useTransition()

    function handleSave() {
        startTransition(async () => {
            const res = await updateSKU(sku.id, { sizeLabel: sizeLabel.trim() || null })
            if (res.success) {
                toast.success("تم تحديث المقاس")
                onUpdated()
            } else {
                toast.error(res.error || "فشل التحديث")
            }
        })
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>تعديل المقاس</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>المقاس</Label>
                        <Input
                            placeholder="30ml, 50ml, L..."
                            value={sizeLabel}
                            onChange={e => setSizeLabel(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSave} disabled={isPending} className="w-full">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}

function SkuPricingSection({ sku, onUpdated }: { sku: SerializedSKUDetail; onUpdated: () => void }) {
    const { prices, setPrices, priceLabels, currencies } = useProductPricing({
        initialPrices: sku.productPrices,
        initialUnits: sku.product.productUnits,
    })

    return (
        <PriceListPanel
            skuId={sku.id}
            prices={prices}
            productUnits={sku.product.productUnits}
            priceLabels={priceLabels}
            currencies={currencies}
            onPricesChange={(p) => { setPrices(p); onUpdated() }}
        />
    )
}

export function SkuDetailsClient({ sku }: { sku: SerializedSKUDetail }) {
    const router = useRouter()
    const [newSizeLabel, setNewSizeLabel] = useState("")
    const [addingSku, setAddingSku] = useState(false)
    const [togglingSkuAvail, setTogglingSkuAvail] = useState(false)
    const [togglingSkcAvail, setTogglingSkcAvail] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deletingSkc, setDeletingSkc] = useState(false)
    const [attributeCatalog, setAttributeCatalog] = useState<ProductAttribute[]>([])

    useEffect(() => {
        void getProductAttributes().then(res => {
            if (res.success && res.data) setAttributeCatalog(res.data)
        })
    }, [])

    const attributeEntries = resolveSkcAttributeEntries(sku.skc.attributes, attributeCatalog)

    const sizeTitle = sku.sizeLabel || "قياس موحّد"
    const primaryImage = sku.skc.images.find(i => i.isPrimary) || sku.skc.images[0]
    const productUnits = sku.product.productUnits ?? []
    const siblings = sku.skc.siblingSkus

    const handleAddSku = async () => {
        setAddingSku(true)
        const res = await addSKU({ skcId: sku.skc.id, sizeLabel: newSizeLabel.trim() || null })
        setAddingSku(false)
        if (res.success && res.data?.id) {
            toast.success("تم إضافة المقاس")
            setNewSizeLabel("")
            router.push(`/items/${res.data.id}`)
            router.refresh()
        } else {
            toast.error(res.error || "فشل الإضافة")
        }
    }

    const handleToggleSkuAvail = async () => {
        setTogglingSkuAvail(true)
        const res = await toggleSkuAvailability(sku.id, sku.isAvailable)
        setTogglingSkuAvail(false)
        if (res.success) router.refresh()
        else toast.error("فشل تحديث التوفر")
    }

    const handleToggleSkcAvail = async () => {
        setTogglingSkcAvail(true)
        const res = await toggleSkcAvailability(sku.skc.id, sku.skc.isAvailable)
        setTogglingSkcAvail(false)
        if (res.success) router.refresh()
        else toast.error("فشل تحديث توفر الصنف")
    }

    const handleDelete = async () => {
        setDeleting(true)
        const res = await removeSKU(sku.id)
        setDeleting(false)
        if (res.success) {
            toast.success("تم حذف المقاس")
            const fallback = siblings.find(s => s.id !== sku.id)
            if (fallback) router.push(`/items/${fallback.id}`)
            else router.push(`/items?productId=${sku.product.id}`)
        } else {
            toast.error(res.error || "فشل الحذف")
        }
    }

    const handleDeleteSkc = async () => {
        setDeletingSkc(true)
        const res = await removeSKC(sku.skc.id)
        setDeletingSkc(false)
        if (res.success) {
            toast.success("تم حذف الصنف وجميع مقاساته")
            router.push(`/items?productId=${sku.product.id}`)
        } else {
            toast.error(res.error || "فشل حذف الصنف")
        }
    }

    return (
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Link href="/items" className="hover:text-primary">الأصناف</Link>
                <ChevronRight className="h-4 w-4" />
                <Link href={`/items?productId=${sku.product.id}`} className="hover:text-primary">{sku.product.name}</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="hover:text-primary">{sku.skc.colorName}</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">{sizeTitle}</span>
            </nav>

            <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-6">
                    <div className="glass-panel rounded-2xl p-6 border border-border/50 space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <h1 className="text-2xl font-bold">{sizeTitle}</h1>
                                <p className="text-sm font-mono text-muted-foreground mt-1">{sku.skuCode}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={sku.isAvailable ? "default" : "outline"}
                                    onClick={handleToggleSkuAvail}
                                    disabled={togglingSkuAvail || !sku.skc.isAvailable}
                                >
                                    {togglingSkuAvail ? <Loader2 className="h-4 w-4 animate-spin" /> : (sku.isAvailable ? "متوفر" : "غير متوفر")}
                                </Button>
                                <SkuEditSheet sku={sku} onUpdated={() => router.refresh()} />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="text-destructive gap-1">
                                            <Trash2 className="h-3.5 w-3.5" />
                                            حذف
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>حذف المقاس؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                سيتم حذف هذا المقاس وأسعاره. لا يمكن التراجع.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                                                {deleting ? "جاري الحذف..." : "حذف"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        {!sku.skc.isAvailable && (
                            <p className="text-xs text-amber-600">الصنف (SKC) غير متوفر — لا يمكن بيع هذا المقاس</p>
                        )}
                    </div>

                    <div className="glass-panel rounded-2xl p-6 border border-border/50">
                        <h2 className="text-lg font-semibold mb-4">التسعير</h2>
                        <SkuPricingSection
                            key={`${sku.id}-${sku.productPrices.length}`}
                            sku={sku}
                            onUpdated={() => router.refresh()}
                        />
                    </div>

                    <div className="glass-panel rounded-2xl p-6 border border-border/50 space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl border shadow-sm" style={{ backgroundColor: sku.skc.hexCode }} />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SKC</p>
                                    <h2 className="text-lg font-semibold">{sku.skc.colorName}</h2>
                                    <p className="text-sm font-mono text-muted-foreground">{sku.product.productNumber}-{sku.skc.colorCode}</p>
                                    {sku.skc.itemNumber && (
                                        <p className="text-xs font-mono text-muted-foreground mt-0.5">رقم الصنف: {sku.skc.itemNumber}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={sku.skc.isAvailable ? "default" : "outline"}
                                    onClick={handleToggleSkcAvail}
                                    disabled={togglingSkcAvail}
                                >
                                    {togglingSkcAvail ? <Loader2 className="h-4 w-4 animate-spin" /> : (sku.skc.isAvailable ? "صنف متوفر" : "صنف غير متوفر")}
                                </Button>
                                <SkcEditSheet sku={sku} onUpdated={() => router.refresh()} />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="text-destructive gap-1">
                                            <Trash2 className="h-3.5 w-3.5" />
                                            حذف الصنف
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>حذف الصنف بالكامل؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                سيتم حذف «{sku.skc.colorName}» وجميع مقاساته وأسعاره. لا يمكن التراجع.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteSkc} disabled={deletingSkc} className="bg-destructive hover:bg-destructive/90">
                                                {deletingSkc ? "جاري الحذف..." : "حذف الصنف"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline"><Package className="h-3 w-3 ml-1" />{sku.product.name}</Badge>
                            {sku.product.brandRef && <Badge variant="secondary">{sku.product.brandRef.name}</Badge>}
                            {sku.product.category && <Badge variant="outline">{sku.product.category.name}</Badge>}
                        </div>

                        {attributeEntries.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                                <span className="text-xs text-muted-foreground w-full">الصفات:</span>
                                {attributeEntries.map(entry => (
                                    <Badge key={entry.code} variant="secondary" className="text-xs font-normal">
                                        {entry.name}: {entry.value}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {productUnits.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                                <Scale className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">وحدات SPU:</span>
                                {productUnits.map(pu => (
                                    <Badge key={pu.unitId} variant="outline" className="text-xs">
                                        {pu.unitName}{pu.isBase ? " (أساس)" : ""}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel rounded-2xl p-6 border border-border/50">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            مقاسات أخرى لنفس اللون
                        </h2>
                        <div className="space-y-2">
                            {siblings.map(s => (
                                <Link
                                    key={s.id}
                                    href={`/items/${s.id}`}
                                    className={cn(
                                        "flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors hover:border-primary/40",
                                        s.id === sku.id ? "bg-primary/5 border-primary/30" : "bg-muted/10"
                                    )}
                                >
                                    <div>
                                        <p className="font-medium text-sm">{s.sizeLabel || "قياس موحّد"}</p>
                                        <p className="text-xs font-mono text-muted-foreground">{s.skuCode}</p>
                                    </div>
                                    <Badge variant={s.isAvailable ? "default" : "secondary"}>
                                        {s.isAvailable ? "متوفر" : "غير متوفر"}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">مقاس جديد</Label>
                                <Input
                                    placeholder="30ml, 50ml, L..."
                                    value={newSizeLabel}
                                    onChange={e => setNewSizeLabel(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddSku} disabled={addingSku} className="gap-2">
                                {addingSku ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                إضافة
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="glass-panel rounded-2xl p-4 border border-border/50">
                        {primaryImage && (
                            <div className="aspect-square relative rounded-xl overflow-hidden mb-4 border">
                                <Image src={primaryImage.url} alt={sku.skc.colorName} fill className="object-cover" />
                            </div>
                        )}
                        <ImageGalleryUpload
                            images={sku.skc.images as Parameters<typeof ImageGalleryUpload>[0]['images']}
                            skcId={sku.skc.id}
                            productItemNumber={sku.product.productNumber}
                            onImagesChange={() => router.refresh()}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
