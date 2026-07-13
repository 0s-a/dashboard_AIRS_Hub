"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceListPanel } from "@/components/inventory/pricing/price-list-panel"
import { useProductPricing } from "@/hooks/use-product-pricing"
import { getProductById } from "@/lib/actions/inventory"
import type { ProductUnitEntry, SerializedPrice } from "@/lib/types/product"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

type ProductPricingContentProps = {
    productId: string
    prices: SerializedPrice[]
    productUnits: ProductUnitEntry[]
    onUpdated: () => void
}

function ProductPricingContent({ productId, prices, productUnits, onUpdated }: ProductPricingContentProps) {
    const { prices: currentPrices, setPrices, priceLabels, currencies } = useProductPricing({
        initialPrices: prices,
        initialUnits: productUnits,
    })

    return (
        <PriceListPanel
            productId={productId}
            prices={currentPrices}
            productUnits={productUnits}
            priceLabels={priceLabels}
            currencies={currencies}
            onPricesChange={p => { setPrices(p); onUpdated() }}
        />
    )
}

type ProductPricingSheetProps = {
    productId: string
    label: string
    initialPrices?: SerializedPrice[]
    productUnits?: ProductUnitEntry[]
    onUpdated: () => void
    trigger?: React.ReactNode
}

export function ProductPricingSheet({
    productId,
    label,
    initialPrices,
    productUnits: initialUnits,
    onUpdated,
    trigger,
}: ProductPricingSheetProps) {
    const prefetched = initialPrices?.length && initialUnits?.length
        ? { prices: initialPrices, productUnits: initialUnits }
        : null

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [lazyData, setLazyData] = useState<{ prices: SerializedPrice[]; productUnits: ProductUnitEntry[] } | null>(null)

    const data = prefetched ?? lazyData

    async function handleOpenChange(val: boolean) {
        setOpen(val)
        if (!val) return
        if (prefetched || lazyData) return

        setLoading(true)
        const res = await getProductById(productId)
        if (res.success && res.data) {
            setLazyData({
                prices: res.data.productPrices,
                productUnits: res.data.productUnits,
            })
        }
        setLoading(false)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline">الأسعار</Button>
                )}
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>أسعار {label}</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : data ? (
                        <ProductPricingContent
                            key={productId}
                            productId={productId}
                            prices={data.prices}
                            productUnits={data.productUnits}
                            onUpdated={onUpdated}
                        />
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
