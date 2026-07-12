"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
    getSpecQuickOptions,
    getSpecPlaceholder,
    getSpecEmptyHint,
    type SkuSpecKind,
    normalizeSkuSpecKind,
} from "@/lib/config/sku-spec.config"

interface SizeLabelFieldProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    id?: string
    specKind?: SkuSpecKind | string | null
}

export function SizeLabelField({ value, onChange, disabled, id, specKind }: SizeLabelFieldProps) {
    const normalized = value.trim()
    const kind = normalizeSkuSpecKind(specKind)
    const quickOptions = getSpecQuickOptions(kind)
    const placeholder = getSpecPlaceholder(kind)
    const emptyHint = getSpecEmptyHint(kind)

    return (
        <div className="space-y-3">
            <Input
                id={id}
                dir="ltr"
                className="font-mono"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
            />
            {quickOptions.length > 1 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">اختيار سريع</p>
                    <div className="flex flex-wrap gap-1.5">
                        {quickOptions.map(opt => {
                            const isActive = normalized === opt.value
                            return (
                                <button
                                    key={`${opt.label}-${opt.value}`}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChange(opt.value)}
                                    className={cn(
                                        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                                        isActive
                                            ? "border-primary bg-primary/10 text-primary font-medium"
                                            : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    )}
                                >
                                    {opt.label}
                                    {opt.value && (
                                        <span className="font-mono text-[10px] opacity-70 mr-1" dir="ltr">
                                            {opt.value}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                اتركه فارغاً لـ «{emptyHint}»
            </p>
        </div>
    )
}

/** معاينة كود SKU على العميل — نفس منطق buildSkuCode */
export function previewSkuCode(
    productNumber: string,
    colorCode: string,
    sizeLabel?: string | null
): string {
    const size = sizeLabel?.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    if (size) return `${productNumber}-${colorCode}-${size}`
    return `${productNumber}-${colorCode}`
}
