// ─────────────────────────────────────────────────────────────
// Item Actions — Public API
// ─────────────────────────────────────────────────────────────

export type {
    ItemInput,
    SerializedPrice,
    SerializedItem,
    SerializedCategory,
    SerializedItemAttribute,
    ItemUnitEntry,
    PaginationMeta,
    ItemsFilters,
} from '@/lib/types/item'

export {
    getItems,
    getItemsPaginated,
    getItemFilterOptions,
    getItemById,
} from './item.queries'

export {
    createItem,
    updateItem,
    deleteItem,
    toggleItemAvailability,
    toggleItemNewTag,
} from './item.actions'

export {
    addItemPrice,
    updateItemPrice,
    deleteItemPrice,
    addItemPricesForAllUnits,
    copyPriceLabelPrices,
} from './price.actions'

export {
    setItemUnits,
} from './unit.actions'

export {
    addAlternativeNameToItem,
    removeAlternativeNameFromItem,
    addTagToItem,
    removeTagFromItem,
} from './metadata.actions'

export {
    getItemsForNewTags,
} from './new-tags.queries'

export type { NewTagItem, NewTagsPaginationMeta } from './new-tags.queries'
