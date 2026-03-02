import { notFound } from "next/navigation"
import { getProductById } from "@/lib/actions/inventory"
import { ProductDetailsClient } from "@/components/inventory/product-details-client"
import type { PriceEntry } from "@/lib/actions/inventory"

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getProductById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    // Transform JsonValue fields to expected types
    const transformedProduct = {
        ...result.data,
        prices: (result.data as any).prices as PriceEntry[] | null,
        variants: (result.data as any).variants || [],
        mediaImages: (result.data as any).mediaImages || [],
        alternativeNames: result.data.alternativeNames as string[] | null,
        tags: (result.data as any).tags as string[] | null,
        productTags: ((result.data as any).productTags || []).map((pt: any) => pt.tag)
    }

    return <ProductDetailsClient product={transformedProduct} />
}

