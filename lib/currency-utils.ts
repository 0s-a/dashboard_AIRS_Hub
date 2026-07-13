// ============================================================
// Currency conversion — catalog prices are always in default currency.
// Foreign: valueInDefault / exchangeRate (same convention as former smart wizard).
// ============================================================

export type ConvertibleCurrency = {
    isDefault?: boolean
    exchangeRate?: number | string | { toString(): string } | null
}

/** Round to 2 decimal places (Decimal(12,2)). */
export function roundMoney(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Convert a catalog price (default currency) into a target currency.
 * - Default / missing rate → return value unchanged
 * - Foreign: value / exchangeRate
 */
export function convertFromDefault(
    valueInDefault: number,
    targetCurrency: ConvertibleCurrency | null | undefined
): number {
    if (targetCurrency == null || targetCurrency.isDefault) {
        return roundMoney(Number(valueInDefault))
    }
    const rate =
        targetCurrency.exchangeRate == null
            ? null
            : Number(targetCurrency.exchangeRate)
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
        return roundMoney(Number(valueInDefault))
    }
    return roundMoney(Number(valueInDefault) / rate)
}
