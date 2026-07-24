"use client"

import { Plus, Trash2, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type CatalogAttribute = {
    id: string
    code: string
    name: string
    examples: string[]
}

export type AttributeDraft = {
    key: string
    attributeId: string
    value: string
}

interface ItemAttributesFieldProps {
    catalog: CatalogAttribute[]
    value: AttributeDraft[]
    onChange: (next: AttributeDraft[]) => void
    disabled?: boolean
}

export function ItemAttributesField({
    catalog,
    value,
    onChange,
    disabled,
}: ItemAttributesFieldProps) {
    const usedIds = new Set(value.map(v => v.attributeId).filter(Boolean))

    const updateRow = (key: string, patch: Partial<AttributeDraft>) => {
        onChange(value.map(row => (row.key === key ? { ...row, ...patch } : row)))
    }

    const removeRow = (key: string) => {
        onChange(value.filter(row => row.key !== key))
    }

    const addRow = () => {
        const next = catalog.find(a => !usedIds.has(a.id))
        if (!next) return
        onChange([
            ...value,
            { key: `${next.id}-${Date.now()}`, attributeId: next.id, value: "" },
        ])
    }

    const availableToAdd = catalog.some(a => !usedIds.has(a.id))

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium flex items-center gap-2">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    صفات الصنف
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || !availableToAdd}
                    onClick={addRow}
                    className="gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة صفة
                </Button>
            </div>

            {value.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    لا توجد صفات — يمكن حفظ الصنف بدون صفات أو إضافة صفة من الكتالوج
                </p>
            )}

            <div className="space-y-3">
                {value.map(row => {
                    const attr = catalog.find(a => a.id === row.attributeId)
                    const options = catalog.filter(
                        a => a.id === row.attributeId || !usedIds.has(a.id)
                    )
                    const examples = attr?.examples ?? []

                    return (
                        <div
                            key={row.key}
                            className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2"
                        >
                            <div className="flex items-start gap-2">
                                <Select
                                    value={row.attributeId || undefined}
                                    onValueChange={id => updateRow(row.key, { attributeId: id, value: "" })}
                                    disabled={disabled}
                                >
                                    <SelectTrigger className="w-[40%] min-w-[8rem]">
                                        <SelectValue placeholder="اختر الصفة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="flex-1 font-mono"
                                    dir="ltr"
                                    placeholder={attr ? `قيمة ${attr.name}` : "القيمة"}
                                    value={row.value}
                                    disabled={disabled || !row.attributeId}
                                    onChange={e => updateRow(row.key, { value: e.target.value })}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={disabled}
                                    onClick={() => removeRow(row.key)}
                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            {examples.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {examples.map(ex => {
                                        const active = row.value.trim() === ex
                                        return (
                                            <button
                                                key={ex}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => updateRow(row.key, { value: ex })}
                                                className={cn(
                                                    "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                                                    active
                                                        ? "border-primary bg-primary/10 text-primary font-medium"
                                                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                )}
                                            >
                                                {ex}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
