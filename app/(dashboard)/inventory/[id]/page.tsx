import { notFound } from "next/navigation"
import { getProductById } from "@/lib/actions/inventory"
import { ProductDetailsClient } from "@/components/inventory/product-details-client"
import type { SerializedProduct } from "@/lib/actions/inventory"

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getProductById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    // serializeProduct() already returns a clean plain object
    const product = result.data as SerializedProduct

    return <ProductDetailsClient product={product} />
}
