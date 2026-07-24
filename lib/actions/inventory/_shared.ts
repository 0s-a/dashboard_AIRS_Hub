// Deprecated internals — prefer @/lib/actions/items/_shared
export {
    prisma,
    Prisma,
    ITEM_INCLUDE as PRODUCT_INCLUDE,
    ITEM_LIST_INCLUDE as PRODUCT_LIST_INCLUDE,
    ITEM_PRICE_INCLUDE as PRODUCT_PRICE_INCLUDE,
    serializeItem as serializeProduct,
    serializeItemUnits as serializeProductUnits,
    serializeItemAttributes as serializeProductAttributes,
    requireItem as requireProduct,
    revalidateItem as revalidateProduct,
    revalidateItemPricing as revalidateProductPricing,
    normalizeAttributeInputs,
} from '@/lib/actions/items/_shared'
