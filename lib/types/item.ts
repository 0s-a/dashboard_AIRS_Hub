import type { ProductMediaImage, ProductUnitEntry, SerializedPrice } from '@/lib/types/product'
import type { SkcAttributes } from '@/lib/utils/skc-attributes'
import type { SerializedSKUDetail, SerializedSKUListItem } from '@/lib/types/skc'
import type { SkuSpecKind } from '@/lib/config/sku-spec.config'
import { formatItemTitleWithSpec, normalizeSkuSpecKind } from '@/lib/config/sku-spec.config'

export type SerializedItemList = {
    id: string
    skuCode: string
    productId: string
    productName: string
    productNumber: string
    colorId: string
    colorName: string
    colorCode: string
    hexCode: string
    sizeLabel: string | null
    itemNumber: string | null
    skuAvailable: boolean
    isAvailable: boolean
    colorUnavailable: boolean
    primaryImage: string | null
    priceCount: number
    skuSpecKind: SkuSpecKind
}

export type SerializedItemSibling = {
    id: string
    sizeLabel: string | null
    skuCode: string
    isAvailable: boolean
}

export type SerializedItemDetail = {
    id: string
    skuCode: string
    sizeLabel: string | null
    skuAvailable: boolean
    isAvailable: boolean
    isDefault: boolean
    productPrices: SerializedPrice[]
    skcId: string
    colorId: string
    colorName: string
    colorCode: string
    hexCode: string
    itemNumber: string | null
    attributes: SkcAttributes | null
    colorUnavailable: boolean
    images: ProductMediaImage[]
    siblingItems: SerializedItemSibling[]
    product: {
        id: string
        name: string
        productNumber: string
        slug: string
        skuSpecKind: SkuSpecKind
        brandRef: { id: string; name: string; code: string } | null
        category: { id: string; name: string; code: string } | null
        productUnits: ProductUnitEntry[]
    }
}

export type ItemInput = {
    productId: string
    colorId: string
    sizeLabel?: string | null
    itemNumber?: string | null
    attributes?: SkcAttributes | null
}

export type ItemUpdateInput = {
    colorId?: string
    sizeLabel?: string | null
    itemNumber?: string | null
    attributes?: SkcAttributes | null
    isAvailable?: boolean
}

export function mapListItem(row: SerializedSKUListItem & { skuSpecKind?: SkuSpecKind }): SerializedItemList {
    const skuSpecKind = normalizeSkuSpecKind(row.skuSpecKind)
    return {
        id: row.id,
        skuCode: row.skuCode,
        productId: row.productId,
        productName: row.productName,
        productNumber: row.productNumber,
        colorId: row.colorId,
        colorName: row.colorName,
        colorCode: row.colorCode,
        hexCode: row.hexCode,
        sizeLabel: row.sizeLabel,
        itemNumber: row.itemNumber,
        skuAvailable: row.isAvailable,
        isAvailable: row.isAvailable && row.skcIsAvailable,
        colorUnavailable: !row.skcIsAvailable,
        primaryImage: row.primaryImage,
        priceCount: row.priceCount,
        skuSpecKind,
    }
}

export function mapItemDetail(detail: SerializedSKUDetail): SerializedItemDetail {
    const colorUnavailable = !detail.skc.isAvailable
    return {
        id: detail.id,
        skuCode: detail.skuCode,
        sizeLabel: detail.sizeLabel,
        skuAvailable: detail.isAvailable,
        isAvailable: detail.isAvailable && detail.skc.isAvailable,
        isDefault: detail.isDefault,
        productPrices: detail.productPrices,
        skcId: detail.skc.id,
        colorId: detail.skc.colorId,
        colorName: detail.skc.colorName,
        colorCode: detail.skc.colorCode,
        hexCode: detail.skc.hexCode,
        itemNumber: detail.skc.itemNumber,
        attributes: detail.skc.attributes,
        colorUnavailable,
        images: detail.skc.images,
        siblingItems: detail.skc.siblingSkus.map(s => ({
            id: s.id,
            sizeLabel: s.sizeLabel,
            skuCode: s.skuCode,
            isAvailable: s.isAvailable,
        })),
        product: {
            ...detail.product,
            skuSpecKind: normalizeSkuSpecKind(detail.product.skuSpecKind),
        },
    }
}

export { formatItemTitleWithSpec as formatItemTitle }
