// ============================================================
// Order Utilities — Dynamic price resolution
// السعر لا يُخزَّن في OrderItem بل يُحسب من ProductPrice
// حسب: تسعيرة العميل المرتبط بالطلب + العملة الافتراضية
// ============================================================

export interface ResolvedPrice {
    price: number
    symbol: string
    priceLabelName: string
}

/**
 * يختار السعر المناسب لبند الطلب بالأولوية:
 * 1. تسعيرة العميل المرتبط بالطلب (بالعملة الافتراضية)
 * 2. التسعيرة الافتراضية للنظام (isDefault=true) بالعملة الافتراضية
 * 3. أي سعر متاح بالعملة الافتراضية
 */
export function resolveItemPrice(
    item: {
        product?: {
            productPrices?: Array<{
                priceLabelId: string
                value: number | string | { toString(): string }
                priceLabel?: { id: string; name: string; isDefault: boolean } | null
                currency?: { symbol: string } | null
            }>
        } | null
    },
    customerPriceLabelId?: string | null
): ResolvedPrice {
    const prices = item.product?.productPrices ?? []

    if (prices.length === 0) {
        return { price: 0, symbol: '', priceLabelName: '—' }
    }

    // 1. سعر تسعيرة العميل
    if (customerPriceLabelId) {
        const match = prices.find(p => p.priceLabelId === customerPriceLabelId)
        if (match) {
            return {
                price: Number(match.value),
                symbol: match.currency?.symbol ?? '',
                priceLabelName: match.priceLabel?.name ?? '—',
            }
        }
    }

    // 2. التسعيرة الافتراضية للنظام
    const defaultLabel = prices.find(p => p.priceLabel?.isDefault)
    if (defaultLabel) {
        return {
            price: Number(defaultLabel.value),
            symbol: defaultLabel.currency?.symbol ?? '',
            priceLabelName: defaultLabel.priceLabel?.name ?? '—',
        }
    }

    // 3. أي سعر متاح
    const fallback = prices[0]
    return {
        price: Number(fallback.value),
        symbol: fallback.currency?.symbol ?? '',
        priceLabelName: fallback.priceLabel?.name ?? '—',
    }
}

/**
 * يحسب إجمالي الطلب من بنوده ديناميكياً
 */
export function calcOrderTotal(
    items: Array<{ quantity?: number | null; product?: any }>,
    customerPriceLabelId?: string | null
): number {
    return items.reduce((sum, item) => {
        const { price } = resolveItemPrice(item, customerPriceLabelId)
        return sum + price * (item.quantity ?? 0)
    }, 0)
}
