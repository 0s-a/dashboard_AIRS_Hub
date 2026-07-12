import type { ProductMediaImage, ProductUnitEntry, SerializedPrice } from '@/lib/types/product'
import type { SerializedColorRef } from '@/lib/types/color'
import type { SkcAttributes } from '@/lib/utils/skc-attributes'

export type { SkcAttributes } from '@/lib/utils/skc-attributes'

export type SerializedSKU = {
    id: string
    skuCode: string
    sizeLabel: string | null
    isAvailable: boolean
    isDefault: boolean
    order: number
    productPrices: SerializedPrice[]
}

export type SerializedSKC = {
    id: string
    itemNumber: string | null
    attributes: SkcAttributes | null
    colorId: string
    color: SerializedColorRef
    /** @deprecated use color.name — kept for display compat */
    colorName: string
    /** @deprecated use color.hexCode */
    hexCode: string
    /** @deprecated use color.code */
    colorCode: string
    isDefault: boolean
    isAvailable: boolean
    order: number
    productId: string
    images: ProductMediaImage[]
    skus: SerializedSKU[]
    skuCount?: number
}

export type SerializedSKUListItem = {
    id: string
    skuCode: string
    sizeLabel: string | null
    isAvailable: boolean
    isDefault: boolean
    order: number
    priceCount: number
    skcId: string
    colorId: string
    colorName: string
    hexCode: string
    colorCode: string
    itemNumber: string | null
    attributes: SkcAttributes | null
    skcIsAvailable: boolean
    primaryImage: string | null
    productId: string
    productName: string
    productNumber: string
    brandName: string | null
    categoryName: string | null
    skuSpecKind?: import('@/lib/config/sku-spec.config').SkuSpecKind
}

export type SerializedSKCListItem = {
    id: string
    itemNumber: string | null
    attributes: SkcAttributes | null
    colorId: string
    colorName: string
    hexCode: string
    colorCode: string
    isDefault: boolean
    isAvailable: boolean
    order: number
    productId: string
    productName: string
    productNumber: string
    brandName: string | null
    categoryName: string | null
    skuCount: number
    primaryImage: string | null
}

export type SerializedSKCDetail = SerializedSKC & {
    product: {
        id: string
        name: string
        productNumber: string
        slug: string
        skuSpecKind?: import('@/lib/config/sku-spec.config').SkuSpecKind
        brandRef: { id: string; name: string; code: string } | null
        category: { id: string; name: string; code: string } | null
        productUnits: ProductUnitEntry[]
    }
}

export type SerializedSKUSibling = {
    id: string
    sizeLabel: string | null
    skuCode: string
    isAvailable: boolean
    isDefault: boolean
}

export type SerializedSKUDetail = SerializedSKU & {
    skc: {
        id: string
        itemNumber: string | null
        attributes: SkcAttributes | null
        colorId: string
        color: SerializedColorRef
        colorName: string
        hexCode: string
        colorCode: string
        isAvailable: boolean
        isDefault: boolean
        images: ProductMediaImage[]
        siblingSkus: SerializedSKUSibling[]
    }
    product: SerializedSKCDetail['product']
}

export type SkcInput = {
    productId: string
    colorId: string
    itemNumber?: string | null
    attributes?: SkcAttributes | null
    /** مقاس/عبوة المقاس الافتراضي عند الإنشاء */
    sizeLabel?: string | null
    isDefault?: boolean
}

export type SkuInput = {
    skcId: string
    sizeLabel?: string | null
    isDefault?: boolean
}

export function mapColorRef(color: { id: string; code: string; name: string; hexCode: string }): SerializedColorRef {
    return {
        id: color.id,
        code: color.code,
        name: color.name,
        hexCode: color.hexCode,
    }
}

export function flatColorFields(color: SerializedColorRef) {
    return {
        colorId: color.id,
        colorName: color.name,
        hexCode: color.hexCode,
        colorCode: color.code,
    }
}
