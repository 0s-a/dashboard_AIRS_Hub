"use client"

import { useProductPricing } from '@/hooks/use-product-pricing'
import { UnitsPanel } from './units-panel'
import { PriceListPanel } from './price-list-panel'
import type { SerializedPrice, ProductUnitEntry } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// PricingSection — Main orchestrator for units + prices
// Uses useProductPricing hook for shared state
// ─────────────────────────────────────────────────────────────

interface PricingSectionProps {
    product: {
        id: string
        itemNumber: string
        name: string
        productPrices: SerializedPrice[]
        productUnits?: ProductUnitEntry[]
    }
}

export function PricingSection({ product }: PricingSectionProps) {
    const {
        prices,
        setPrices,
        productUnits,
        setProductUnits,
        priceLabels,
        currencies,
        sysUnits,
    } = useProductPricing({
        initialPrices: product.productPrices || [],
        initialUnits: product.productUnits || [],
    })

    return (
        <div className="w-full space-y-6">
            {/* Units configuration panel */}
            <UnitsPanel
                productId={product.id}
                productUnits={productUnits}
                sysUnits={sysUnits}
                onUnitsChange={setProductUnits}
            />

            {/* Prices management panel */}
            <PriceListPanel
                productId={product.id}
                prices={prices}
                productUnits={productUnits}
                priceLabels={priceLabels}
                currencies={currencies}
                onPricesChange={setPrices}
            />
        </div>
    )
}
