export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getProductById } from "@/lib/actions/inventory"
import { ProductDetailsClient } from "@/components/products/product-details-client"

export default async function ProductDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const result = await getProductById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ProductDetailsClient product={result.data} />
        </div>
    )
}
