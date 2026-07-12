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
import { toggleItemAvailability } from "@/lib/actions/item"
import type { SerializedItemList } from "@/lib/types/item"
import { INVENTORY_LABELS, formatItemTitle } from "@/lib/config/inventory-labels"

function ItemAvailabilityToggle({ item, onUpdated }: { item: SerializedItemList; onUpdated: () => void }) {
    const [pending, setPending] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const available = pending ?? item.isAvailable

    async function handleToggle(checked: boolean) {
        setPending(checked)
        setLoading(true)
        const res = await toggleItemAvailability(item.id, !checked)
        setLoading(false)
        setPending(null)
        if (res.success) {
            onUpdated()
        } else {
            toast.error(res.error || "فشل تحديث التوفر")
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <Switch
                    checked={available}
                    onCheckedChange={handleToggle}
                    disabled={loading || item.colorUnavailable}
                />
                <span className="text-xs text-muted-foreground">{available ? "متوفر" : "غير متوفر"}</span>
            </div>
            {item.colorUnavailable && (
                <span className="text-[10px] text-amber-600">{INVENTORY_LABELS.colorUnavailable}</span>
            )}
        </div>
    )
}

export function buildItemColumns(onRefresh: () => void): ColumnDef<SerializedItemList>[] {
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
            id: "item",
            header: "الصنف",
            cell: ({ row }) => {
                const item = row.original
                return (
                    <Link href={`/items/${item.id}`} className="hover:text-primary min-w-0 block">
                        <div className="flex items-center gap-2">
                            {item.hexCode && (
                                <span
                                    className="h-4 w-4 rounded-full border shrink-0"
                                    style={{ backgroundColor: item.hexCode }}
                                />
                            )}
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                    {formatItemTitle(item.colorName, item.sizeLabel, item.skuSpecKind)}
                                </p>
                                <p className="text-xs font-mono text-muted-foreground truncate" dir="ltr">
                                    {item.skuCode}
                                </p>
                            </div>
                        </div>
                    </Link>
                )
            },
        },
        {
            id: "product",
            header: "المنتج",
            cell: ({ row }) => (
                <Link href={`/items?productId=${row.original.productId}`} className="hover:text-primary">
                    <p className="font-medium text-sm">{row.original.productName}</p>
                    <p className="text-xs font-mono text-muted-foreground" dir="ltr">
                        {row.original.productNumber}
                    </p>
                </Link>
            ),
        },
        {
            id: "itemNumber",
            header: INVENTORY_LABELS.itemNumber,
            cell: ({ row }) => (
                <span className="text-xs font-mono">
                    {row.original.itemNumber || "—"}
                </span>
            ),
        },
        {
            id: "prices",
            header: "الأسعار",
            cell: ({ row }) => (
                <SkuPricingSheet
                    skuId={row.original.id}
                    label={formatItemTitle(row.original.colorName, row.original.sizeLabel, row.original.skuSpecKind)}
                    onUpdated={onRefresh}
                    trigger={<Badge variant="secondary" className="cursor-pointer">{row.original.priceCount}</Badge>}
                />
            ),
        },
        {
            id: "availability",
            header: "التوفر",
            cell: ({ row }) => (
                <ItemAvailabilityToggle item={row.original} onUpdated={onRefresh} />
            ),
        },
        {
            id: "actions",
            header: () => <div className="text-left">إجراءات</div>,
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/items/${row.original.id}`} title="تفاصيل الصنف">
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </Button>
            ),
        },
    ]
}
