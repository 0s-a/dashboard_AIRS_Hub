import { notFound } from "next/navigation"
import { getProductById } from "@/lib/actions/inventory"
import { ProductDetailsClient } from "@/components/inventory/product-details-client"

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getProductById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    // Transform JsonValue fields to expected types
    const transformedProduct = {
        ...result.data,
        imagePath: (result.data as any).imagePath ?? null,
        colors: result.data.colors as Array<{
            itemNumber: string
            name: string
            code: string
            imagePath: string | null
        }> | null,
        images: result.data.images as Array<{
            url: string
            alt?: string
            isPrimary: boolean
            order?: number
        }> | null,
        alternativeNames: result.data.alternativeNames as string[] | null
    }

    return <ProductDetailsClient product={transformedProduct} />
}
