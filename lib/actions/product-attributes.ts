'use server'

// Thin re-export shim — prefer @/lib/actions/item-attributes
export {
    getItemAttributes as getProductAttributes,
    getItemAttributeById as getProductAttributeById,
    createItemAttribute as createProductAttribute,
    updateItemAttribute as updateProductAttribute,
    deleteItemAttribute as deleteProductAttribute,
} from './item-attributes'
