// ============================================================
// Order Utilities — Dynamic price resolution
// السعر يُحسب بالأولوية:
// 1. unitPrice (snapshot) — المُثبَّت وقت إنشاء الطلب ← الأولوية
// 2. تسعيرة العميل من ProductPrice (للطلبات القديمة بدون snapshot)
// 3. التسعيرة الافتراضية للنظام (isDefault=true)
// 4. أي سعر متاح
// ملاحظة: ProductPrice يُخزَّن بالعملة الافتراضية فقط؛ التحويل عند الإنشاء عبر resolveItemSnapshot
// ============================================================

export interface ResolvedPrice {
    price: number
    symbol: string
    priceLabelName: string
    isSnapshot: boolean  // true إذا كان السعر مُثبَّتاً، false إذا كان محسوباً ديناميكياً
}

/**
 * يختار السعر المناسب لبند الطلب بالأولوية:
 * 1. unitPrice snapshot (مُثبَّت وقت إنشاء الطلب) — لا يتغير أبداً
 * 2. تسعيرة العميل المرتبط بالطلب (بالعملة الافتراضية) — للطلبات القديمة
 * 3. التسعيرة الافتراضية للنظام (isDefault=true) بالعملة الافتراضية
 * 4. أي سعر متاح بالعملة الافتراضية
 */
export function resolveItemPrice(
    item: {
        unitPrice?: number | string | null       // Snapshot — الأولوية القصوى
        currency?: { symbol: string } | null     // Snapshot currency
        priceLabel?: { name: string } | null     // Snapshot label
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
    // ── 1. Snapshot — السعر المُثبَّت وقت إنشاء الطلب ──
    if (item.unitPrice != null) {
        return {
            price: Number(item.unitPrice),
            symbol: item.currency?.symbol ?? '',
            priceLabelName: item.priceLabel?.name ?? '—',
            isSnapshot: true,
        }
    }

    // ── Fallback الديناميكي للطلبات القديمة ──
    const prices = item.product?.productPrices ?? []

    if (prices.length === 0) {
        return { price: 0, symbol: '', priceLabelName: '—', isSnapshot: false }
    }

    // 2. سعر تسعيرة العميل
    if (customerPriceLabelId) {
        const match = prices.find((p: { priceLabelId: string }) => p.priceLabelId === customerPriceLabelId)
        if (match) {
            return {
                price: Number(match.value),
                symbol: match.currency?.symbol ?? '',
                priceLabelName: match.priceLabel?.name ?? '—',
                isSnapshot: false,
            }
        }
    }

    // 3. التسعيرة الافتراضية للنظام
    const defaultLabel = prices.find(p => p.priceLabel?.isDefault === true)
    if (defaultLabel) {
        return {
            price: Number(defaultLabel.value),
            symbol: defaultLabel.currency?.symbol ?? '',
            priceLabelName: defaultLabel.priceLabel?.name ?? '—',
            isSnapshot: false,
        }
    }

    // 4. أي سعر متاح
    const fallback = prices[0]
    return {
        price: Number(fallback.value),
        symbol: fallback.currency?.symbol ?? '',
        priceLabelName: fallback.priceLabel?.name ?? '—',
        isSnapshot: false,
    }
}

/**
 * يحسب إجمالي الطلب من بنوده
 * يعطي أولوية لـ unitPrice snapshot إذا كان موجوداً
 */
export function calcOrderTotal(
    items: Array<{ quantity?: number | null; unitPrice?: number | string | null; product?: any; currency?: any; priceLabel?: any }>,
    customerPriceLabelId?: string | null
): number {
    return items.reduce((sum, item) => {
        const { price } = resolveItemPrice(item, customerPriceLabelId)
        return sum + price * (item.quantity ?? 0)
    }, 0)
}
