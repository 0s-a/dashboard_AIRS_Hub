import { useState, useEffect } from 'react'
import { getPriceLabels } from '@/lib/actions/price-labels'
import { getActiveCurrencies } from '@/lib/actions/currencies'
import { getActiveUnits } from '@/lib/actions/units'
import type { SerializedPrice, ProductUnitEntry } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// useProductPricing — Centralized state for the pricing section
// Handles all data fetching and local state management
// ─────────────────────────────────────────────────────────────

type CurrencyOption = { id: string; name: string; symbol: string; exchangeRate?: number | null; isDefault?: boolean }
type SysUnit = { id: string; name: string; pluralName?: string | null }
type PriceLabel = { id: string; name: string }

interface UseProductPricingOptions {
    initialPrices: SerializedPrice[]
    initialUnits: ProductUnitEntry[]
}

export function useProductPricing({ initialPrices, initialUnits }: UseProductPricingOptions) {
    // ── Core data ─────────────────────────────────────────────
    const [prices, setPrices] = useState<SerializedPrice[]>(initialPrices)
    const [productUnits, setProductUnits] = useState<ProductUnitEntry[]>(initialUnits)

    // ── Reference data (fetched once) ─────────────────────────
    const [priceLabels, setPriceLabels] = useState<PriceLabel[]>([])
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
    const [sysUnits, setSysUnits] = useState<SysUnit[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getPriceLabels(),
            getActiveCurrencies(),
            getActiveUnits(),
        ]).then(([labelsRes, currenciesRes, unitsRes]) => {
            if (labelsRes.success && labelsRes.data)     setPriceLabels(labelsRes.data)
            if (currenciesRes.success && currenciesRes.data) setCurrencies(currenciesRes.data as CurrencyOption[])
            if (unitsRes.success && unitsRes.data)       setSysUnits(unitsRes.data)
        }).finally(() => setIsLoading(false))
    }, [])

    return {
        // Data
        prices,
        setPrices,
        productUnits,
        setProductUnits,

        // Reference data
        priceLabels,
        currencies,
        sysUnits,
        isLoading,
    }
}
