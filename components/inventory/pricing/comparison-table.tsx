"use client"

import type { SerializedPrice, ProductUnitEntry } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// Comparison Table — Matrix: units × price labels (default currency)
// ─────────────────────────────────────────────────────────────

interface ComparisonTableProps {
    prices: SerializedPrice[]
    productUnits: Pick<ProductUnitEntry, 'unitId' | 'unitName' | 'conversionFactor' | 'isBase'>[]
    labelNames: string[]
    defaultCurrencySymbol?: string
}

export function ComparisonTable({
    prices,
    productUnits,
    labelNames,
    defaultCurrencySymbol,
}: ComparisonTableProps) {
    if (labelNames.length === 0) {
        return (
            <p className="text-center text-xs text-muted-foreground py-6">لا توجد قوائم أسعار بعد</p>
        )
    }

    return (
        <div className="rounded-xl border border-border/30 overflow-auto">
            <table className="w-full text-right text-xs border-collapse">
                <thead>
                    <tr className="bg-muted/30 border-b border-border/30">
                        <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase">الوحدة</th>
                        <th className="px-3 py-2 text-[9px] text-center">×</th>
                        {labelNames.map(ln => (
                            <th
                                key={ln}
                                className="px-4 py-2 text-[9px] font-bold text-primary uppercase text-left border-r border-border/20"
                            >
                                {ln}
                                {defaultCurrencySymbol ? ` (${defaultCurrencySymbol})` : ''}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                    {productUnits.map(row => (
                        <tr key={row.unitId} className={`hover:bg-muted/10 ${row.isBase ? 'bg-primary/[0.01]' : ''}`}>
                            <td className="px-4 py-2.5 font-bold">{row.unitName}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">×{row.conversionFactor}</td>
                            {labelNames.map(ln => {
                                const price = prices.find(
                                    p => p.unitId === row.unitId && p.priceLabelName === ln
                                )
                                return (
                                    <td key={ln} className="px-4 py-2.5 text-left font-mono font-bold border-r border-border/10">
                                        {price
                                            ? (
                                                <span className="text-foreground">
                                                    {Number(price.value).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            )
                                            : <span className="text-muted-foreground/30">—</span>}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
