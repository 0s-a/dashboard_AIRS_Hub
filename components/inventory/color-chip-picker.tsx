"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Palette, Search } from "lucide-react"
import type { Color } from "@prisma/client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getColors } from "@/lib/actions/colors"

interface ColorChipPickerProps {
    selected: string[]
    onChange: (ids: string[]) => void
    productNumber?: string
}

export function ColorChipPicker({ selected, onChange, productNumber }: ColorChipPickerProps) {
    const [colors, setColors] = useState<Color[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        void getColors(true).then(res => {
            if (res.success && res.data) setColors(res.data)
            setLoading(false)
        })
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return colors
        return colors.filter(
            c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        )
    }, [colors, search])

    const selectedColors = useMemo(
        () => colors.filter(c => selected.includes(c.id)),
        [colors, selected]
    )

    function toggle(colorId: string) {
        if (selected.includes(colorId)) {
            onChange(selected.filter(id => id !== colorId))
        } else {
            onChange([...selected, colorId])
        }
    }

    const skuPreview = productNumber?.trim() && selectedColors.length > 0
        ? selectedColors.map(c => `${productNumber.toUpperCase()}-${c.code}`).join(" · ")
        : null

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري تحميل الألوان...
            </div>
        )
    }

    if (colors.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-2">
                <Palette className="h-5 w-5 mx-auto opacity-50" />
                <p>لا توجد ألوان نشطة في الكتalog.</p>
                <Link href="/colors" className="text-primary hover:underline text-xs">
                    إدارة الألوان
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="بحث بالاسم أو الكود..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pr-9"
                />
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center w-full">لا توجد نتائج</p>
                ) : (
                    filtered.map(color => {
                        const isSelected = selected.includes(color.id)
                        return (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => toggle(color.id)}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                                    isSelected
                                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                        : "border-border bg-muted/30 hover:bg-muted/60"
                                )}
                            >
                                <span
                                    className="h-4 w-4 rounded-full border border-border shrink-0"
                                    style={{ backgroundColor: color.hexCode }}
                                />
                                <span>{color.name}</span>
                                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                                    {color.code}
                                </span>
                            </button>
                        )
                    })
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    {selected.length > 0
                        ? `${selected.length.toLocaleString("ar-YE")} ${selected.length === 1 ? "لون محدد" : "ألوان محددة"}`
                        : "اختياري — يمكنك إضافة الألوان لاحقاً من صفحة الأصناف"}
                </span>
                <Link href="/colors" className="text-primary hover:underline">
                    إدارة الألوان
                </Link>
            </div>

            {skuPreview && (
                <div className="rounded-md bg-muted/40 border border-border/60 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">معاينة SKU: </span>
                    <span className="font-mono text-foreground" dir="ltr">{skuPreview}</span>
                </div>
            )}

            {selectedColors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedColors.map(c => (
                        <Badge key={c.id} variant="secondary" className="gap-1.5 font-normal">
                            <span
                                className="h-3 w-3 rounded-full border border-border"
                                style={{ backgroundColor: c.hexCode }}
                            />
                            {c.name}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
