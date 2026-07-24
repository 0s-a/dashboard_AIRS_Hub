"use client"

import { useTransition } from "react"
import { Scale, Plus, Edit2, Save, Barcode, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { setItemUnits } from "@/lib/actions/items"
import type { ItemUnitEntry } from "@/lib/types/item"

// ─────────────────────────────────────────────────────────────
// Units Panel — Select and configure item units
// ─────────────────────────────────────────────────────────────

interface UnitsPanelProps {
    itemId: string
    itemUnits: ItemUnitEntry[]
    sysUnits: { id: string; name: string; pluralName?: string | null }[]
    onUnitsChange: (units: ItemUnitEntry[]) => void
}

export function UnitsPanel({ itemId, itemUnits, sysUnits, onUnitsChange }: UnitsPanelProps) {
    const [isPending, startTransition] = useTransition()

    const toggleUnit = (unitId: string) => {
        const exists = itemUnits.find(u => u.unitId === unitId)
        let newUnits = [...itemUnits]

        if (exists) {
            newUnits = newUnits.filter(u => u.unitId !== unitId)
        } else {
            newUnits.push({
                id: Math.random().toString(),
                unitId,
                unitName: sysUnits.find(u => u.id === unitId)?.name || "",
                conversionFactor: 1,
                barcode: null,
                isBase: newUnits.length === 0,
                order: newUnits.length,
            })
        }

        // Ensure at least one base unit
        if (newUnits.length > 0 && !newUnits.some(u => u.isBase)) {
            newUnits[0].isBase = true
            newUnits[0].conversionFactor = 1
        }

        saveUnits(newUnits)
    }

    const updateField = (rowId: string, field: 'conversionFactor' | 'barcode', value: string | number) => {
        onUnitsChange(itemUnits.map(u => u.id === rowId ? { ...u, [field]: value } : u))
    }

    const setAsBase = (rowId: string) => {
        const newUnits = itemUnits.map(u => ({
            ...u,
            isBase: u.id === rowId,
            conversionFactor: u.id === rowId ? 1 : u.conversionFactor,
        }))
        saveUnits(newUnits)
    }

    const saveUnits = (unitsToSave = itemUnits) => {
        startTransition(async () => {
            const res = await setItemUnits(itemId, unitsToSave.map(u => ({
                unitId: u.unitId,
                isBase: u.isBase,
                conversionFactor: u.conversionFactor || 1,
                barcode: u.barcode || undefined,
            })))
            if (res.success && res.data) {
                onUnitsChange((res.data as any).itemUnits || [])
                toast.success("تم تحديث وحدات الصنف")
            } else {
                toast.error((res as any).error || "فشل تحديث الوحدات")
            }
        })
    }

    const isDirty = JSON.stringify(itemUnits) !== JSON.stringify(itemUnits) // always false - save is explicit

    return (
        <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 bg-linear-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scale className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-bold bg-linear-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">وحدات القياس</span>
                        <span className="text-[10px] text-muted-foreground">اختر الوحدات المتاحة لهذا الصنف وقم بتحديد سعة كل منها</span>
                    </div>
                </div>
                <Button
                    size="sm"
                    onClick={() => saveUnits()}
                    disabled={isPending}
                    className="gap-2 shrink-0 rounded-xl px-4 shadow-sm hover:shadow-md transition-all"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ التغييرات
                </Button>
            </div>

            <div className="p-6 space-y-8">
                {/* Unit Selection Grid */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-3 h-3" /> اختيار الوحدات المتاحة
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {sysUnits.map(su => {
                            const isSelected = itemUnits.some(u => u.unitId === su.id)
                            return (
                                <button
                                    key={su.id}
                                    onClick={() => !isPending && toggleUnit(su.id)}
                                    disabled={isPending}
                                    className={`px-4 py-2 rounded-xl border transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                                        isSelected
                                            ? 'bg-primary/10 border-primary/40 text-primary shadow-xs'
                                            : 'bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                                    }`}
                                >
                                    <div className={`size-2 rounded-full ${isSelected ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-muted-foreground/30'}`} />
                                    {su.name}
                                    {isSelected && <X className="size-3 ml-1 opacity-50 hover:opacity-100" />}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Selected Units Configuration Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2">
                        <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
                            <Edit2 className="w-3 h-3" /> تهيئة سعة الوحدات والباركود
                        </h4>
                        {itemUnits.length > 0 && (
                            <Badge variant="outline" className="text-[9px] h-4 bg-primary/5 text-primary/70 border-primary/20">
                                {itemUnits.length} وحدات مختارة
                            </Badge>
                        )}
                    </div>

                    {itemUnits.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                            <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
                                <Scale className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                            <p className="text-sm text-muted-foreground">لم يتم اختيار أي وحدات بعد. اختر من القائمة أعلاه للبدء.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border/50 overflow-hidden bg-background/30 backdrop-blur-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-muted/40 border-b border-border/50">
                                            <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">اسم الوحدة</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">النوع</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">معامل التحويل (الكمية)</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">الباركود (Barcode)</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {[...itemUnits].sort((a, b) => (a.isBase ? -1 : 1)).map(pu => (
                                            <tr key={pu.id} className={`group transition-colors ${pu.isBase ? 'bg-primary/[0.02]' : 'hover:bg-muted/20'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-sm ${pu.isBase ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background border border-border/50 text-muted-foreground'}`}>
                                                            {pu.unitName.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-sm">{pu.unitName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {pu.isBase ? (
                                                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5 px-2 shadow-none">وحدة أساسية</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] h-5 px-2 border-border/50 text-muted-foreground">وحدة مضافة</Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <div className="relative w-24">
                                                            <Input
                                                                type="number" min="1"
                                                                disabled={pu.isBase || isPending}
                                                                value={pu.isBase ? 1 : pu.conversionFactor}
                                                                onChange={(e) => updateField(pu.id, 'conversionFactor', parseInt(e.target.value) || 1)}
                                                                className={`h-8 text-center font-bold font-mono bg-background/50 border-border/50 focus:border-primary/30 ${pu.isBase ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            />
                                                            {pu.isBase && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative group/input max-w-[180px]">
                                                        <Input
                                                            placeholder="0000000000"
                                                            disabled={isPending}
                                                            value={pu.barcode || ''}
                                                            onChange={(e) => updateField(pu.id, 'barcode', e.target.value)}
                                                            className="h-8 font-mono text-xs bg-background/50 border-border/50 focus:border-primary/30 pr-8"
                                                        />
                                                        <Barcode className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40 group-focus-within/input:text-primary/50 transition-colors" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    {!pu.isBase && (
                                                        <button
                                                            onClick={() => setAsBase(pu.id)}
                                                            className="text-[10px] font-bold text-primary hover:underline underline-offset-4 decoration-primary/30 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            تعيين كأساسية
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
