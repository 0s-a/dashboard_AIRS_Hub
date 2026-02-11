import { InventoryTable } from "./inventory-table"
import { getProducts } from "@/lib/actions/inventory"
import { ProductSheet } from "@/components/inventory/product-sheet"

export default async function InventoryPage() {
    const result = await getProducts()
    const rawProducts = result.data || []

    // Serialize Decimal types to numbers for Client Components
    const products = rawProducts.map(product => ({
        ...product,
        price: Number(product.price),
        variants: (product as any).variants?.map((v: any) => ({
            ...v,
            price: v.price ? Number(v.price) : null
        })) || []
    }))

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
