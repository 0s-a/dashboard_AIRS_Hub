export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemDetail } from "@/lib/actions/item"
import { ItemDetailsClient } from "@/components/items/item-details-client"
import { formatItemTitle, INVENTORY_LABELS } from "@/lib/config/inventory-labels"

export async function generateMetadata({ params }: { params: Promise<{ skuId: string }> }): Promise<Metadata> {
    const { skuId } = await params
    const result = await getItemDetail(skuId)
    if (!result.success || !result.data) {
        return { title: INVENTORY_LABELS.itemNotFound }
    }
    const title = formatItemTitle(result.data.colorName, result.data.sizeLabel, result.data.product.skuSpecKind)
    return {
        title: `${title} — ${result.data.product.name}`,
    }
}

export default async function ItemDetailsPage({ params }: { params: Promise<{ skuId: string }> }) {
    const { skuId } = await params
    const result = await getItemDetail(skuId)

    if (!result.success || !result.data) {
        const legacySku = await prisma.sKU.findFirst({
            where: { skcId: skuId },
            orderBy: [{ isDefault: "desc" }, { order: "asc" }],
            select: { id: true },
        })
        if (legacySku) redirect(`/items/${legacySku.id}`)
        notFound()
    }

    return <ItemDetailsClient item={result.data} />
}
