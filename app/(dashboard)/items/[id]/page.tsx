export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getItemById } from "@/lib/actions/items"
import { ItemDetailsClient } from "@/components/items/item-details-client"

export default async function ItemDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const result = await getItemById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ItemDetailsClient item={result.data} />
        </div>
    )
}
