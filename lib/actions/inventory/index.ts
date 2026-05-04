// ─────────────────────────────────────────────────────────────
// Inventory Actions — Public API
//
// All imports from '@/lib/actions/inventory' continue to work
// unchanged thanks to this barrel re-export file.
// ─────────────────────────────────────────────────────────────

// Types (re-exported so consumers can import from one place)
export type { ProductInput, SerializedPrice, ProductUnitEntry, PaginationMeta, ProductsFilters } from '@/lib/types/product'

// Queries (read-only)
export {
    getProducts,
    getProductsPaginated,
    getProductFilterOptions,
    getProductById,
    searchProducts,
} from './product.queries'

// Product CRUD (write)
export {
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    toggleProductAvailability,
    updateProductDescription,
} from './product.actions'

// Price management
export {
    addProductPrice,
    updateProductPrice,
    deleteProductPrice,
    addProductPricesForAllUnits,
    copyPriceLabelPrices,
} from './price.actions'

// Unit management
export {
    setProductUnits,
} from './unit.actions'

// Metadata (tags + alternative names)
export {
    addAlternativeNameToProduct,
    removeAlternativeNameFromProduct,
    addTagToProduct,
    removeTagFromProduct,
} from './metadata.actions'
