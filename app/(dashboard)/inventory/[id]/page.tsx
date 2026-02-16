import { notFound } from "next/navigation"
import { getProductById } from "@/lib/actions/inventory"
import { ProductDetailsClient } from "@/components/inventory/product-details-client"

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getProductById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    // Transform colors from JsonValue to the expected type
    const transformedProduct = {
        ...result.data,
        colors: result.data.colors as Array<{
            itemNumber: string
            name: string
            code: string
            imagePath: string | null
        }> | null,
        alternativeNames: result.data.alternativeNames as string[] | null
    }

    return <ProductDetailsClient product={transformedProduct} />
}
