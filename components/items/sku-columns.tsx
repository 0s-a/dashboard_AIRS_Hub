"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { ColumnDef } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SkuPricingSheet } from "@/components/items/sku-pricing-sheet"
import { toggleSkuAvailability } from "@/lib/actions/sku"
import type { SerializedSKUListItem } from "@/lib/types/skc"

function SkuAvailabilityToggle({ item, onUpdated }: { item: SerializedSKUListItem; onUpdated: () => void }) {
    const [pending, setPending] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const available = pending ?? item.isAvailable

    async function handleToggle(checked: boolean) {
        setPending(checked)
        setLoading(true)
        const res = await toggleSkuAvailability(item.id, !checked)
        setLoading(false)
        setPending(null)
        if (res.success) {
            onUpdated()
        } else {
            toast.error("فشل تحديث التوفر")
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <Switch checked={available} onCheckedChange={handleToggle} disabled={loading || !item.skcIsAvailable} />
                <span className="text-xs text-muted-foreground">{available ? "متوفر" : "غير متوفر"}</span>
            </div>
            {!item.skcIsAvailable && (
                <span className="text-[10px] text-amber-600">الصنف غير متوفر</span>
            )}
        </div>
    )
}

export function buildSkuColumns(onRefresh: () => void): ColumnDef<SerializedSKUListItem>[] {
    return [
        {
            id: "image",
            header: "صورة",
            cell: ({ row }) => {
                const url = row.original.primaryImage
                return url ? (
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden border">
                        <Image src={url} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted border" />
                )
            },
        },
        {
            id: "product",
            header: "المنتج",
            cell: ({ row }) => (
                <Link href={`/items?productId=${row.original.productId}`} className="hover:text-primary">
                    <p className="font-medium text-sm">{row.original.productName}</p>
                    <p className="text-xs font-mono text-muted-foreground">{row.original.productNumber}</p>
                </Link>
            ),
        },
        {
            id: "brandCategory",
            header: "البراند / التصنيف",
            cell: ({ row }) => (
                <div className="text-xs text-muted-foreground space-y-0.5">
                    {row.original.brandName && <p>{row.original.brandName}</p>}
                    {row.original.categoryName && <p>{row.original.categoryName}</p>}
                    {!row.original.brandName && !row.original.categoryName && <span>—</span>}
                </div>
            ),
        },
        {
            id: "color",
            header: "اللون / الصنف",
            cell: ({ row }) => (
                <Link href={`/items/${row.original.id}`} className="font-semibold text-sm hover:text-primary">
                    <div className="flex items-center gap-2">
                        {row.original.hexCode && (
                            <span className="h-4 w-4 rounded-full border shrink-0" style={{ backgroundColor: row.original.hexCode }} />
                        )}
                        {row.original.colorName}
                    </div>
                </Link>
            ),
        },
        {
            id: "skcCode",
            header: "رمز الصنف",
            cell: ({ row }) => (
                <div className="text-xs font-mono space-y-0.5">
                    <p className="text-muted-foreground">{row.original.productNumber}-{row.original.colorCode}</p>
                    {row.original.itemNumber && (
                        <p className="text-foreground">{row.original.itemNumber}</p>
                    )}
                </div>
            ),
        },
        {
            id: "attributes",
            header: "الصفات",
            cell: ({ row }) => {
                const count = row.original.attributes ? Object.keys(row.original.attributes).length : 0
                if (count === 0) return <span className="text-xs text-muted-foreground">—</span>
                const preview = Object.entries(row.original.attributes!).slice(0, 2)
                return (
                    <div className="text-xs space-y-0.5">
                        <Badge variant="outline">{count}</Badge>
                        {preview.map(([code, value]) => (
                            <p key={code} className="text-muted-foreground truncate max-w-[120px]" title={`${code}: ${value}`}>
                                {code}: {value}
                            </p>
                        ))}
                    </div>
                )
            },
        },
        {
            id: "size",
            header: "المقاس",
            cell: ({ row }) => (
                <Link href={`/items/${row.original.id}`} className="text-sm hover:text-primary">
                    {row.original.sizeLabel || "قياس موحّد"}
                </Link>
            ),
        },
        {
            accessorKey: "skuCode",
            header: "كود SKU",
            cell: ({ row }) => (
                <Link href={`/items/${row.original.id}`} className="text-xs font-mono text-muted-foreground hover:text-primary">
                    {row.original.skuCode}
                </Link>
            ),
        },
        {
            id: "prices",
            header: "الأسعار",
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.priceCount}</Badge>
            ),
        },
        {
            accessorKey: "isAvailable",
            header: "التوفر",
            cell: ({ row }) => (
                <SkuAvailabilityToggle item={row.original} onUpdated={onRefresh} />
            ),
        },
        {
            id: "actions",
            header: () => <div className="text-left">إجراءات</div>,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <SkuPricingSheet
                        skuId={row.original.id}
                        label={row.original.sizeLabel || row.original.skuCode}
                        onUpdated={onRefresh}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/items/${row.original.id}`} title="تفاصيل المقاس">
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ]
}
