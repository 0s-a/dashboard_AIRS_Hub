'use server'
// Deprecated — prefer @/lib/actions/items/price.actions
export {
    addItemPrice as addProductPrice,
    updateItemPrice as updateProductPrice,
    deleteItemPrice as deleteProductPrice,
    addItemPricesForAllUnits as addProductPricesForAllUnits,
    copyPriceLabelPrices,
    getItemPrices as getProductPrices,
} from '../items/price.actions'
