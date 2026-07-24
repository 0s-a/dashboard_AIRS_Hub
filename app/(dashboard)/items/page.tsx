export const dynamic = "force-dynamic"

import { ItemsTable } from "./items-table"
import { getItemsPaginated, getItemFilterOptions } from "@/lib/actions/items"
import { ItemSheet } from "@/components/items/item-sheet"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Package, Search } from "lucide-react"

export default async function ItemsPage() {
    const [result, filterOpts] = await Promise.all([
        getItemsPaginated({ page: 1, limit: 25, sortBy: 'createdAt', sortDir: 'desc' }),
        getItemFilterOptions(),
    ])

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-l from-primary/5 to-indigo-500/5 border border-primary/10 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1.5 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 shadow-md shadow-primary/20 text-white">
                            <Package className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                            الأصناف
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-lg pr-1">
                        إدارة الأصناف القابلة للبيع — البيانات، الصور، الوحدات، والتسعير من صفحة واحدة.
                    </p>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                    <Link href="/inventory/search-engine">
                        <Button variant="outline" className="gap-2">
                            <Search className="h-4 w-4" />
                            محرك البحث
                        </Button>
                    </Link>
                    <ItemSheet />
                </div>
            </div>
            <ItemsTable
                initialItems={result.data || []}
                initialPagination={result.pagination}
                filterCategories={filterOpts.categories}
                filterBrands={filterOpts.brands}
                filterProducts={filterOpts.products}
            />
        </div>
    )
}
