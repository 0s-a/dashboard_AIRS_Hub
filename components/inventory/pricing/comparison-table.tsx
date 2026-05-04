"use client"

import type { SerializedPrice, ProductUnitEntry } from '@/lib/types/product'

// ─────────────────────────────────────────────────────────────
// Comparison Table — Matrix view of prices across labels & units
// ─────────────────────────────────────────────────────────────

interface ComparisonTableProps {
    prices: SerializedPrice[]
    productUnits: Pick<ProductUnitEntry, 'unitId' | 'unitName' | 'conversionFactor' | 'isBase'>[]
    labelNames: string[]
}

export function ComparisonTable({ prices, productUnits, labelNames }: ComparisonTableProps) {
    const unitRows = productUnits.map(pu => {
        const row: Record<string, SerializedPrice | undefined> = {}
        labelNames.forEach(ln => {
            row[ln] = prices.find(p => p.unitId === pu.unitId && p.priceLabelName === ln)
        })
        return { ...pu, prices: row }
    })

    if (labelNames.length === 0) return (
        <p className="text-center text-xs text-muted-foreground py-6">لا توجد قوائم أسعار بعد</p>
    )

    // Build per-label currency columns
    const labelCurrencies: Record<string, { id: string; name: string; symbol: string }[]> = {}
    labelNames.forEach(ln => {
        const seen = new Set<string>()
        labelCurrencies[ln] = prices
            .filter(p => p.priceLabelName === ln)
            .reduce((acc, p) => {
                if (!seen.has(p.currencyId)) {
                    seen.add(p.currencyId)
                    acc.push({ id: p.currencyId, name: p.currencyName, symbol: p.currencySymbol })
                }
                return acc
            }, [] as { id: string; name: string; symbol: string }[])
    })

    return (
        <div className="rounded-xl border border-border/30 overflow-auto">
            <table className="w-full text-right text-xs border-collapse">
                <thead>
                    {/* Row 1: Label names as column groups */}
                    <tr className="bg-muted/30 border-b border-border/30">
                        <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase" rowSpan={2}>الوحدة</th>
                        <th className="px-3 py-2 text-[9px] text-center" rowSpan={2}>×</th>
                        {labelNames.map(ln => (
                            <th key={ln} colSpan={labelCurrencies[ln].length || 1}
                                className="px-4 py-2 text-[9px] font-bold text-primary uppercase text-center border-r border-border/20">
                                {ln}
                            </th>
                        ))}
                    </tr>
                    {/* Row 2: Currency sub-headers */}
                    <tr className="bg-muted/20 border-b border-border/30">
                        {labelNames.map(ln =>
                            labelCurrencies[ln].map(c => (
                                <th key={`${ln}-${c.id}`}
                                    className="px-4 py-1.5 text-[9px] font-semibold text-muted-foreground text-left border-r border-border/10">
                                    {c.symbol} {c.name}
                                </th>
                            ))
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                    {unitRows.map(row => (
                        <tr key={row.unitId} className={`hover:bg-muted/10 ${row.isBase ? 'bg-primary/[0.01]' : ''}`}>
                            <td className="px-4 py-2.5 font-bold">{row.unitName}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">×{row.conversionFactor}</td>
                            {labelNames.map(ln =>
                                labelCurrencies[ln].map(c => {
                                    const price = prices.find(p =>
                                        p.unitId === row.unitId &&
                                        p.priceLabelName === ln &&
                                        p.currencyId === c.id
                                    )
                                    return (
                                        <td key={`${ln}-${c.id}`}
                                            className="px-4 py-2.5 text-left font-mono font-bold border-r border-border/10">
                                            {price
                                                ? <span className="text-foreground">{Number(price.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                : <span className="text-muted-foreground/30">—</span>
                                            }
                                        </td>
                                    )
                                })
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
