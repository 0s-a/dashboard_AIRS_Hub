"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
    ChevronRight,
    Package,
    Plus,
    Loader2,
    Trash2,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageGalleryUpload } from "@/components/ui/image-gallery-upload"
import { PriceListPanel } from "@/components/inventory/pricing/price-list-panel"
import { ItemEditSheet } from "@/components/items/item-edit-sheet"
import { useProductPricing } from "@/hooks/use-product-pricing"
import { deleteItem, toggleItemAvailability, addSiblingItem } from "@/lib/actions/item"
import { getProductAttributes } from "@/lib/actions/product-attributes"
import type { SerializedItemDetail } from "@/lib/types/item"
import type { ProductAttribute } from "@prisma/client"
import { resolveSkcAttributeEntries } from "@/lib/utils/skc-attributes"
import { INVENTORY_LABELS, formatItemTitle } from "@/lib/config/inventory-labels"
import { getSpecLabel, getSiblingSpecsLabel, getAddSpecLabel } from "@/lib/config/sku-spec.config"
import { toast } from "sonner"
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

function ItemPricingSection({ item, onUpdated }: { item: SerializedItemDetail; onUpdated: () => void }) {
    const { prices, setPrices, priceLabels, currencies } = useProductPricing({
        initialPrices: item.productPrices,
        initialUnits: item.product.productUnits,
    })

    return (
        <PriceListPanel
            skuId={item.id}
            prices={prices}
            productUnits={item.product.productUnits}
            priceLabels={priceLabels}
            currencies={currencies}
            onPricesChange={(p) => { setPrices(p); onUpdated() }}
        />
    )
}

export function ItemDetailsClient({ item }: { item: SerializedItemDetail }) {
    const router = useRouter()
    const [newSizeLabel, setNewSizeLabel] = useState("")
    const [addingSibling, setAddingSibling] = useState(false)
    const [togglingAvail, setTogglingAvail] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [siblingsOpen, setSiblingsOpen] = useState(false)
    const [attributeCatalog, setAttributeCatalog] = useState<ProductAttribute[]>([])

    const title = formatItemTitle(item.colorName, item.sizeLabel, item.product.skuSpecKind)
    const specKind = item.product.skuSpecKind
    const primaryImage = item.images.find(i => i.isPrimary) || item.images[0]
    const siblings = item.siblingItems.filter(s => s.id !== item.id)

    useEffect(() => {
        void getProductAttributes().then(res => {
            if (res.success && res.data) setAttributeCatalog(res.data)
        })
    }, [])

    const attributeEntries = resolveSkcAttributeEntries(item.attributes, attributeCatalog)

    const handleToggleAvail = async () => {
        setTogglingAvail(true)
        const res = await toggleItemAvailability(item.id, item.skuAvailable)
        setTogglingAvail(false)
        if (res.success) router.refresh()
        else toast.error(res.error || "فشل تحديث التوفر")
    }

    const handleDelete = async () => {
        setDeleting(true)
        const res = await deleteItem(item.id)
        setDeleting(false)
        if (res.success) {
            toast.success(`تم حذف ${INVENTORY_LABELS.item}`)
            const fallback = siblings[0]
            if (fallback) router.push(`/items/${fallback.id}`)
            else router.push(`/items?productId=${item.product.id}`)
        } else {
            toast.error(res.error || "فشل الحذف")
        }
    }

    const handleAddSibling = async () => {
        setAddingSibling(true)
        const res = await addSiblingItem(
            item.product.id,
            item.colorId,
            newSizeLabel.trim() || null
        )
        setAddingSibling(false)
        if (res.success && res.data.id) {
            toast.success(`تم إضافة ${INVENTORY_LABELS.item}`)
            setNewSizeLabel("")
            router.push(`/items/${res.data.id}`)
            router.refresh()
        } else if (!res.success) {
            toast.error(res.error || "فشل الإضافة")
        }
    }

    return (
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Link href="/items" className="hover:text-primary">{INVENTORY_LABELS.items}</Link>
                <ChevronRight className="h-4 w-4" />
                <Link href={`/items?productId=${item.product.id}`} className="hover:text-primary">
                    {item.product.name}
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">{title}</span>
            </nav>

            <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-6">
                    <div className="glass-panel rounded-2xl p-6 border border-border/50">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-4">
                                {primaryImage && (
                                    <div className="relative h-16 w-16 rounded-xl overflow-hidden border shrink-0">
                                        <Image src={primaryImage.url} alt={item.colorName} fill className="object-cover" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span
                                            className="h-5 w-5 rounded-full border shrink-0"
                                            style={{ backgroundColor: item.hexCode }}
                                        />
                                        <h1 className="text-2xl font-bold">{title}</h1>
                                    </div>
                                    <p className="text-sm font-mono text-muted-foreground" dir="ltr">{item.skuCode}</p>
                                    {item.itemNumber && (
                                        <p className="text-xs font-mono text-muted-foreground mt-1">
                                            {INVENTORY_LABELS.itemNumber}: {item.itemNumber}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={item.isAvailable ? "default" : "outline"}
                                    onClick={handleToggleAvail}
                                    disabled={togglingAvail || item.colorUnavailable}
                                >
                                    {togglingAvail ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        item.isAvailable ? "متوفر" : "غير متوفر"
                                    )}
                                </Button>
                                <ItemEditSheet item={item} onUpdated={() => router.refresh()} />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="text-destructive gap-1">
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {INVENTORY_LABELS.deleteItem}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{INVENTORY_LABELS.deleteItem}؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                سيتم حذف «{title}» وأسعاره. لا يمكن التراجع.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                {deleting ? "جاري الحذف..." : "حذف"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        {item.colorUnavailable && (
                            <p className="text-xs text-amber-600 mt-3">{INVENTORY_LABELS.colorUnavailable}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
                            <Badge variant="outline"><Package className="h-3 w-3 ml-1" />{item.product.name}</Badge>
                            {item.product.brandRef && <Badge variant="secondary">{item.product.brandRef.name}</Badge>}
                            {item.product.category && <Badge variant="outline">{item.product.category.name}</Badge>}
                        </div>
                        {attributeEntries.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {attributeEntries.map(entry => (
                                    <Badge key={entry.code} variant="secondary" className="text-xs font-normal">
                                        {entry.name}: {entry.value}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel rounded-2xl p-6 border border-border/50">
                        <h2 className="text-lg font-semibold mb-4">التسعير</h2>
                        <ItemPricingSection
                            key={`${item.id}-${item.productPrices.length}`}
                            item={item}
                            onUpdated={() => router.refresh()}
                        />
                    </div>

                    <div className="glass-panel rounded-2xl p-6 border border-border/50">
                        <button
                            type="button"
                            className="flex items-center justify-between w-full text-left"
                            onClick={() => setSiblingsOpen(v => !v)}
                        >
                            <h2 className="text-lg font-semibold">{getSiblingSpecsLabel(specKind)}</h2>
                            {siblingsOpen ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                        </button>
                        {siblingsOpen && (
                            <div className="mt-4 space-y-3">
                                {siblings.map(s => (
                                        <Link
                                            key={s.id}
                                            href={`/items/${s.id}`}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/10 hover:border-primary/40 transition-colors"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {formatItemTitle(item.colorName, s.sizeLabel, specKind)}
                                                </p>
                                                <p className="text-xs font-mono text-muted-foreground" dir="ltr">{s.skuCode}</p>
                                            </div>
                                            <Badge variant={s.isAvailable ? "default" : "secondary"}>
                                                {s.isAvailable ? "متوفر" : "غير متوفر"}
                                            </Badge>
                                        </Link>
                                    ))}
                                    <div className="flex gap-2 items-end pt-2">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">{getAddSpecLabel(specKind)}</Label>
                                            <Input
                                                placeholder="30ml, 50ml, L..."
                                                value={newSizeLabel}
                                                onChange={e => setNewSizeLabel(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={handleAddSibling} disabled={addingSibling} className="gap-2">
                                            {addingSibling ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plus className="h-4 w-4" />
                                            )}
                                            إضافة
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="glass-panel rounded-2xl p-4 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-3">{INVENTORY_LABELS.sharedImagesNote}</p>
                        {primaryImage && (
                            <div className="aspect-square relative rounded-xl overflow-hidden mb-4 border">
                                <Image src={primaryImage.url} alt={item.colorName} fill className="object-cover" />
                            </div>
                        )}
                        <ImageGalleryUpload
                            images={item.images as Parameters<typeof ImageGalleryUpload>[0]["images"]}
                            skcId={item.skcId}
                            productItemNumber={item.product.productNumber}
                            onImagesChange={() => router.refresh()}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
