"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceListPanel } from "@/components/inventory/pricing/price-list-panel"
import { useProductPricing } from "@/hooks/use-product-pricing"
import { getSKUById } from "@/lib/actions/sku"
import type { ProductUnitEntry, SerializedPrice } from "@/lib/types/product"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

type SkuPricingContentProps = {
    skuId: string
    prices: SerializedPrice[]
    productUnits: ProductUnitEntry[]
    onUpdated: () => void
}

function SkuPricingContent({ skuId, prices, productUnits, onUpdated }: SkuPricingContentProps) {
    const { prices: currentPrices, setPrices, priceLabels, currencies } = useProductPricing({
        initialPrices: prices,
        initialUnits: productUnits,
    })

    return (
        <PriceListPanel
            skuId={skuId}
            prices={currentPrices}
            productUnits={productUnits}
            priceLabels={priceLabels}
            currencies={currencies}
            onPricesChange={(p) => { setPrices(p); onUpdated() }}
        />
    )
}

type SkuPricingSheetProps = {
    skuId: string
    label: string
    initialPrices?: SerializedPrice[]
    productUnits?: ProductUnitEntry[]
    onUpdated: () => void
    trigger?: React.ReactNode
}

export function SkuPricingSheet({
    skuId,
    label,
    initialPrices,
    productUnits: initialUnits,
    onUpdated,
    trigger,
}: SkuPricingSheetProps) {
    const prefetched = initialPrices && initialUnits
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
        const res = await getSKUById(skuId)
        if (res.success) {
            setLazyData({ prices: res.data.productPrices, productUnits: res.data.productUnits })
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
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>أسعار {label}</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : data ? (
                        <SkuPricingContent
                            key={skuId}
                            skuId={skuId}
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
