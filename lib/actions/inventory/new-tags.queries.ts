'use server'
// Deprecated — prefer @/lib/actions/items/new-tags.queries
export {
    getItemsForNewTags as getProductsForNewTags,
} from '../items/new-tags.queries'
export type {
    NewTagItem as NewTagProduct,
    NewTagsPaginationMeta,
} from '../items/new-tags.queries'
