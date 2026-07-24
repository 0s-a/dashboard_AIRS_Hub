import { useItemPricing } from './use-item-pricing'
import type { SerializedPrice, ItemUnitEntry } from '@/lib/types/item'

/** @deprecated Prefer useItemPricing from @/hooks/use-item-pricing */
export function useProductPricing(options: {
    initialPrices: SerializedPrice[]
    initialUnits: ItemUnitEntry[]
}) {
    const pricing = useItemPricing(options)
    return {
        ...pricing,
        productUnits: pricing.itemUnits,
        setProductUnits: pricing.setItemUnits,
    }
}
