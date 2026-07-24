'use server'
// Deprecated — prefer @/lib/actions/items/item.queries
export {
    getItems as getProducts,
    getItemsPaginated as getProductsPaginated,
    getItemFilterOptions as getProductFilterOptions,
    getItemById as getProductById,
} from '../items/item.queries'
