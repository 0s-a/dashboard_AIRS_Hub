'use server'
// Deprecated — prefer @/lib/actions/items/item.actions
export {
    createItem as createProduct,
    updateItem as updateProduct,
    deleteItem as deleteProduct,
    toggleItemAvailability as toggleProductAvailability,
    toggleItemNewTag as toggleProductNewTag,
    createItemWithDefaults as createProductWithDefaults,
} from '../items/item.actions'
