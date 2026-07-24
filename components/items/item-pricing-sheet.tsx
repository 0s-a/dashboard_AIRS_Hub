"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceListPanel } from "@/components/items/pricing/price-list-panel"
import { useItemPricing } from "@/hooks/use-item-pricing"
import { getItemById } from "@/lib/actions/items"
import type { ItemUnitEntry, SerializedPrice } from "@/lib/types/item"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

type ItemPricingContentProps = {
    itemId: string
    prices: SerializedPrice[]
    itemUnits: ItemUnitEntry[]
    onUpdated: () => void
}

function ItemPricingContent({ itemId, prices, itemUnits, onUpdated }: ItemPricingContentProps) {
    const { prices: currentPrices, setPrices, priceLabels, currencies } = useItemPricing({
        initialPrices: prices,
        initialUnits: itemUnits,
    })

    return (
        <PriceListPanel
            itemId={itemId}
            prices={currentPrices}
            itemUnits={itemUnits}
            priceLabels={priceLabels}
            currencies={currencies}
            onPricesChange={p => { setPrices(p); onUpdated() }}
        />
    )
}

type ItemPricingSheetProps = {
    itemId: string
    label: string
    initialPrices?: SerializedPrice[]
    itemUnits?: ItemUnitEntry[]
    onUpdated: () => void
    trigger?: React.ReactNode
}

export function ItemPricingSheet({
    itemId,
    label,
    initialPrices,
    itemUnits: initialUnits,
    onUpdated,
    trigger,
}: ItemPricingSheetProps) {
    const prefetched = initialPrices?.length && initialUnits?.length
        ? { prices: initialPrices, itemUnits: initialUnits }
        : null

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [lazyData, setLazyData] = useState<{ prices: SerializedPrice[]; itemUnits: ItemUnitEntry[] } | null>(null)

    const data = prefetched ?? lazyData

    async function handleOpenChange(val: boolean) {
        setOpen(val)
        if (!val) return
        if (prefetched || lazyData) return

        setLoading(true)
        const res = await getItemById(itemId)
        if (res.success && res.data) {
            setLazyData({
                prices: res.data.itemPrices,
                itemUnits: res.data.itemUnits,
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
                        <ItemPricingContent
                            key={itemId}
                            itemId={itemId}
                            prices={data.prices}
                            itemUnits={data.itemUnits}
                            onUpdated={onUpdated}
                        />
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
