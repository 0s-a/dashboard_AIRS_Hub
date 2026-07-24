'use server'

// Thin re-export shim — prefer @/lib/actions/item-images
export type { ItemImageRecord as ProductImageRecord } from './item-images'
export {
    getItemImages as getProductImages,
    addItemImage as addProductImage,
    removeItemImage as removeProductImage,
    setPrimaryItemImage as setPrimaryProductImage,
    reorderItemImages as reorderProductImages,
} from './item-images'
