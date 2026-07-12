'use client'

import React from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { ValidatedRow } from '@/lib/actions/import'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, XCircle, Trash2, Save } from 'lucide-react'

import { SerializedCategory } from '@/lib/types/product'

interface ImportTableProps {
    rows: ValidatedRow[]
    onRowChange: (id: string, field: keyof ValidatedRow, value: string) => void
    onRemoveRow: (id: string) => void
    onImportRow?: (id: string) => void
    categories?: SerializedCategory[]
    brands?: any[]
}

export function ImportTable({ rows, onRowChange, onRemoveRow, onImportRow, categories = [], brands = [] }: ImportTableProps) {
    const [animationParent] = useAutoAnimate()

    if (rows.length === 0) {
        return null
    }

    return (
        <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 font-medium text-right w-10">الحالة</th>
                            <th className="px-4 py-3 font-medium text-right min-w-[200px]">الاسم (name)</th>
                            <th className="px-4 py-3 font-medium text-right min-w-[100px]">رقم المنتج</th>
                            <th className="px-4 py-3 font-medium text-right min-w-[150px]">رقم الصنف (itemNumber)</th>
                            <th className="px-4 py-3 font-medium text-right min-w-[150px]">كود التصنيف (categoryCode)</th>
                            <th className="px-4 py-3 font-medium text-right min-w-[120px]">كود البرند (brandCode)</th>
                            <th className="px-4 py-3 font-medium text-right w-16">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" ref={animationParent}>
                        {rows.map((row) => (
                            <tr key={row._id} className={`group ${!row.isValid ? 'bg-destructive/5' : ''}`}>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center">
                                        {row.isValid ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <div className="relative flex group-hover:cursor-help" title={row.errors.join('\n')}>
                                                <XCircle className="w-5 h-5 text-destructive" />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <Input
                                        value={row.name}
                                        onChange={(e) => onRowChange(row._id, 'name', e.target.value)}
                                        className={`h-8 ${!row.isValid && row.errors.some(e => e.includes('الاسم')) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <Input
                                        value={row.productNumber}
                                        onChange={(e) => onRowChange(row._id, 'productNumber', e.target.value.toUpperCase())}
                                        maxLength={3}
                                        className={`h-8 font-mono text-xs uppercase ${!row.isValid && row.errors.some(e => e.includes('رقم المنتج')) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                        dir="ltr"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <Input
                                        value={row.itemNumber}
                                        onChange={(e) => onRowChange(row._id, 'itemNumber', e.target.value)}
                                        className={`h-8 ${!row.isValid && row.errors.some(e => e.includes('رقم الصنف')) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <Input
                                        list="categories-datalist"
                                        value={row.categoryCode}
                                        onChange={(e) => onRowChange(row._id, 'categoryCode', e.target.value)}
                                        className={`h-8 font-mono text-xs ${!row.isValid && row.errors.some(e => e.includes('الصنف')) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                        placeholder="أدخل الكود..."
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <Input
                                        list="brands-datalist"
                                        value={row.brandCode}
                                        onChange={(e) => onRowChange(row._id, 'brandCode', e.target.value)}
                                        className={`h-8 font-mono text-xs ${!row.isValid && row.errors.some(e => e.includes('الماركة')) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                        placeholder="أدخل الكود..."
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <div className="flex gap-1">
                                        {row.isValid && onImportRow && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => onImportRow(row._id)}
                                                title="استيراد هذا الصف"
                                            >
                                                <Save className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onRemoveRow(row._id)}
                                            title="حذف هذا الصف"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {rows.some(r => !r.isValid) && (
                <div className="bg-destructive/10 p-3 text-sm text-destructive border-t">
                    <p className="font-semibold mb-1">تفاصيل الأخطاء:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {Array.from(new Set(rows.flatMap(r => r.errors))).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Datalists for Combobox functionality */}
            <datalist id="categories-datalist">
                {categories.map(c => (
                    <option key={c.id} value={c.code}>{c.name}</option>
                ))}
            </datalist>
            <datalist id="brands-datalist">
                {brands.map(b => (
                    <option key={b.id} value={b.code}>{b.name}</option>
                ))}
            </datalist>
        </div>
    )
}
