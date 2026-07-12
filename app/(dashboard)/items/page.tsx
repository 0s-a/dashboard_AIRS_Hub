export const dynamic = "force-dynamic"

import { getItemsPaginated } from "@/lib/actions/item"
import { getProductFilterOptions, getProductById } from "@/lib/actions/inventory"
import { ItemsTable } from "@/components/items/items-table"
import { ItemSheet } from "@/components/items/item-sheet"
import { Layers } from "lucide-react"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"

export default async function ItemsPage({
    searchParams,
}: {
    searchParams: Promise<{ productId?: string }>
}) {
    const { productId } = await searchParams
    const [result, filterOpts] = await Promise.all([
        getItemsPaginated({ page: 1, limit: 25, productId }),
        getProductFilterOptions(),
    ])

    let productName: string | undefined
    let productNumber: string | null | undefined
    if (productId) {
        const pRes = await getProductById(productId)
        if (pRes.success && pRes.data) {
            productName = pRes.data.name
            productNumber = pRes.data.productNumber ?? null
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{INVENTORY_LABELS.items}</h1>
                        <p className="text-sm text-muted-foreground">
                            {productName
                                ? `${INVENTORY_LABELS.items} — ${productName}`
                                : `كل ${INVENTORY_LABELS.item} = ${INVENTORY_LABELS.product} + ${INVENTORY_LABELS.color} + مواصفة`}
                        </p>
                    </div>
                </div>
                <ItemSheet
                    defaultProductId={productId}
                    defaultProductName={productName}
                    defaultProductNumber={productNumber}
                />
            </div>
            <ItemsTable
                initialItems={result.success ? result.data : []}
                initialPagination={result.success ? result.pagination : { page: 1, limit: 25, total: 0, pages: 1, hasPrev: false, hasNext: false }}
                productId={productId}
                productName={productName}
                filterOptions={filterOpts.success ? { categories: filterOpts.categories, brands: filterOpts.brands } : undefined}
            />
        </div>
    )
}
