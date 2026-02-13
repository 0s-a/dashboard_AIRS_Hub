import { InventoryTable } from "./inventory-table"
import { getProducts } from "@/lib/actions/inventory"
import { ProductSheet } from "@/components/inventory/product-sheet"

export default async function InventoryPage() {
    const result = await getProducts()
    const products = result.data || []

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">إدارة المخزون</h1>
                    <p className="text-muted-foreground text-sm mt-2 opacity-80">تتبع المنتجات والكميات المتاحة في متجرك بكل سهولة ويسر</p>
                </div>
                <ProductSheet />
            </div>
            <InventoryTable products={products} />
        </div>
    )
}
