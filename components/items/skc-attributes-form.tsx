"use client"

import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import type { ProductAttribute } from "@prisma/client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SkcAttributes } from "@/lib/utils/skc-attributes"

type SkcAttributesFormProps = {
    catalog: ProductAttribute[]
    value: SkcAttributes
    onChange: (value: SkcAttributes) => void
    disabled?: boolean
}

export function SkcAttributesForm({ catalog, value, onChange, disabled }: SkcAttributesFormProps) {
    if (catalog.length === 0) {
        return (
            <Card className="border-dashed border-border/60 bg-muted/20">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        لا توجد صفات معرّفة في الكتalog.{" "}
                        <Link href="/product-attributes" className="text-primary hover:underline font-medium">
                            أضف صفات من صفحة خصائص المنتجات
                        </Link>
                    </p>
                </CardContent>
            </Card>
        )
    }

    const filledCount = Object.keys(value).filter(k => value[k]?.trim()).length

    function handleChange(code: string, raw: string) {
        const next = { ...value }
        const trimmed = raw.trim()
        if (trimmed) {
            next[code] = trimmed
        } else {
            delete next[code]
        }
        onChange(next)
    }

    return (
        <Card className="border-border/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">صفات الصنف</CardTitle>
                    </div>
                    {filledCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {filledCount} / {catalog.length}
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    قيم اختيارية حسب كتalog الصفات — تظهر في تفاصيل الصنف والبحث
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catalog.map(attr => {
                        const fieldValue = value[attr.code] ?? ""
                        const hasValue = !!fieldValue.trim()
                        return (
                            <div
                                key={attr.id}
                                className={cn(
                                    "space-y-1.5 rounded-lg border p-3 transition-colors",
                                    hasValue ? "border-primary/25 bg-primary/5" : "border-border/40 bg-muted/10"
                                )}
                            >
                                <Label htmlFor={`attr-${attr.code}`} className="flex flex-col gap-0.5 items-start">
                                    <span className="font-medium">{attr.name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">
                                        {attr.code}
                                    </span>
                                </Label>
                                {attr.description && (
                                    <p className="text-[11px] text-muted-foreground leading-snug">{attr.description}</p>
                                )}
                                <Input
                                    id={`attr-${attr.code}`}
                                    placeholder={`مثال: قيمة ${attr.name}...`}
                                    value={fieldValue}
                                    onChange={e => handleChange(attr.code, e.target.value)}
                                    disabled={disabled}
                                    className="h-9 bg-background/80"
                                />
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
