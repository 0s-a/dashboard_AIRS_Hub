import { useState, useEffect } from 'react'
import { getPriceLabels } from '@/lib/actions/price-labels'
import { getActiveCurrencies } from '@/lib/actions/currencies'
import { getActiveUnits } from '@/lib/actions/units'
import type { SerializedPrice, ItemUnitEntry } from '@/lib/types/item'

type CurrencyOption = { id: string; name: string; symbol: string; exchangeRate?: number | null; isDefault?: boolean }
type SysUnit = { id: string; name: string; pluralName?: string | null }
type PriceLabel = { id: string; name: string; isDefault?: boolean }

interface UseItemPricingOptions {
    initialPrices: SerializedPrice[]
    initialUnits: ItemUnitEntry[]
}

export function useItemPricing({ initialPrices, initialUnits }: UseItemPricingOptions) {
    const [prices, setPrices] = useState<SerializedPrice[]>(initialPrices)
    const [itemUnits, setItemUnits] = useState<ItemUnitEntry[]>(initialUnits)
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
            if (labelsRes.success && labelsRes.data) setPriceLabels(labelsRes.data)
            if (currenciesRes.success && currenciesRes.data) setCurrencies(currenciesRes.data as CurrencyOption[])
            if (unitsRes.success && unitsRes.data) setSysUnits(unitsRes.data)
        }).finally(() => setIsLoading(false))
    }, [])

    return {
        prices,
        setPrices,
        itemUnits,
        setItemUnits,
        priceLabels,
        currencies,
        sysUnits,
        isLoading,
    }
}
