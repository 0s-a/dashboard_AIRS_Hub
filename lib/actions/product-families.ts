'use server'

// Thin re-export shim — prefer @/lib/actions/products
export {
    getProducts as getProductFamilies,
    createProduct as createProductFamily,
    updateProduct as updateProductFamily,
    deleteProduct as deleteProductFamily,
} from './products'
