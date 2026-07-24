// Thin re-export shim — prefer @/lib/actions/items
// Maps legacy Product (SKU) action names → Item actions for gradual UI migration.

export type {
    ItemInput as ProductInput,
    SerializedPrice,
    SerializedItem as SerializedProduct,
    SerializedCategory,
    SerializedItemAttribute as SerializedProductAttribute,
    ItemUnitEntry as ProductUnitEntry,
    PaginationMeta,
    ItemsFilters as ProductsFilters,
} from '@/lib/types/item'

export {
    getItems as getProducts,
    getItemsPaginated as getProductsPaginated,
    getItemFilterOptions as getProductFilterOptions,
    getItemById as getProductById,
} from '../items/item.queries'

export {
    createItem as createProduct,
    updateItem as updateProduct,
    deleteItem as deleteProduct,
    toggleItemAvailability as toggleProductAvailability,
    toggleItemNewTag as toggleProductNewTag,
} from '../items/item.actions'

export {
    addItemPrice as addProductPrice,
    updateItemPrice as updateProductPrice,
    deleteItemPrice as deleteProductPrice,
    addItemPricesForAllUnits as addProductPricesForAllUnits,
    copyPriceLabelPrices,
} from '../items/price.actions'

export {
    setItemUnits as setProductUnits,
} from '../items/unit.actions'

export {
    addAlternativeNameToItem as addAlternativeNameToProduct,
    removeAlternativeNameFromItem as removeAlternativeNameFromProduct,
    addTagToItem as addTagToProduct,
    removeTagFromItem as removeTagFromProduct,
} from '../items/metadata.actions'
