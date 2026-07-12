"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Search, Loader2, X, Sparkles, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ServerPagination } from "@/components/ui/server-pagination"
import { toggleProductNewTag } from "@/lib/actions/inventory"
import { getProductsForNewTags } from "@/lib/actions/inventory/new-tags.queries"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { NewTagProduct, NewTagsPaginationMeta } from "@/lib/actions/inventory/new-tags.queries"

const DEBOUNCE_MS = 350

const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
]

function getBrandGradient(name: string) {
    return gradients[name.charCodeAt(0) % gradients.length]
}

// ─── Product Row ─────────────────────────────────────────────────────────────

function ProductRow({ product, onToggle }: { product: NewTagProduct; onToggle: (id: string, isNew: boolean) => void }) {
    const [pending, startTransition] = useTransition()

    const handleChange = (checked: boolean) => {
        startTransition(async () => {
            const res = await toggleProductNewTag(product.id, checked)
            if (res.success) {
                toast.success(checked ? "تمت إضافة علامة جديد ✨" : "تمت إزالة علامة جديد")
                onToggle(product.id, checked)
            } else {
                toast.error(res.error || "حدث خطأ أثناء التحديث")
            }
        })
    }

    return (
        <tr className={cn(
            "group border-b border-border/40 transition-colors hover:bg-muted/30",
            product.isNew && "bg-emerald-500/5 hover:bg-emerald-500/10",
        )}>
            {/* Checkbox */}
            <td className="px-4 py-3 w-[60px]">
                <div className="flex items-center justify-center">
                    {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <Checkbox
                            checked={product.isNew}
                            onCheckedChange={handleChange}
                            disabled={pending}
                            className={cn(
                                "transition-all",
                                product.isNew && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 shadow-sm shadow-emerald-500/20"
                            )}
                        />
                    )}
                </div>
            </td>

            {/* Image */}
            <td className="px-4 py-3 w-[70px]">
                {product.primaryImage ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-sm group/img">
                        <Image
                            src={product.primaryImage}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover/img:scale-110"
                        />
                    </div>
                ) : (
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-muted/30 border border-dashed border-border/50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                )}
            </td>

            {/* Name + isNew badge */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate max-w-[280px]">{product.name}</span>
                    {product.isNew && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold px-2 py-0.5 shrink-0 gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            جديد
                        </Badge>
                    )}
                </div>
            </td>

            {/* Brand */}
            <td className="px-4 py-3 w-[160px]">
                {product.brandRef ? (
                    <div className="flex items-center gap-2">
                        {product.brandRef.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={product.brandRef.logo}
                                alt={product.brandRef.name}
                                className="h-6 w-6 rounded-md object-contain border border-border/40 bg-white p-0.5 shrink-0"
                            />
                        ) : (
                            <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${getBrandGradient(product.brandRef.name)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                                {product.brandRef.code}
                            </div>
                        )}
                        <span className="text-xs font-medium truncate max-w-[100px]">{product.brandRef.name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </td>

            {/* Product Number */}
            <td className="px-4 py-3 w-[150px]">
                <span className="text-xs font-mono text-muted-foreground">{product.productNumber}</span>
            </td>
        </tr>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface NewTagsTableProps {
    initialProducts: NewTagProduct[]
    initialPagination: NewTagsPaginationMeta
}

export function NewTagsTable({ initialProducts, initialPagination }: NewTagsTableProps) {
    const [isPending, startTransition] = useTransition()
    const [products, setProducts] = useState<NewTagProduct[]>(initialProducts)
    const [pagination, setPagination] = useState(initialPagination)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(initialPagination.limit)
    const [filterNew, setFilterNew] = useState<boolean | undefined>(undefined)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetch = useCallback((params: { search?: string; page?: number; limit?: number; filterNew?: boolean }) => {
        startTransition(async () => {
            const res = await getProductsForNewTags({
                search: params.search,
                page: params.page ?? 1,
                limit: params.limit ?? limit,
                filterNew: params.filterNew,
            })
            if (res.success) {
                setProducts(res.data)
                setPagination(res.pagination)
            }
        })
    }, [limit])

    const handleSearch = (value: string) => {
        setSearch(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            setPage(1)
            fetch({ search: value || undefined, page: 1, filterNew })
        }, DEBOUNCE_MS)
    }

    const handleFilterNew = (val: boolean | undefined) => {
        setFilterNew(val)
        setPage(1)
        fetch({ search: search || undefined, page: 1, filterNew: val })
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        fetch({ search: search || undefined, page: newPage, filterNew })
    }

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit)
        setPage(1)
        fetch({ search: search || undefined, page: 1, limit: newLimit, filterNew })
    }

    // Optimistic update on toggle
    const handleToggle = (id: string, isNew: boolean) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, isNew } : p))
    }

    const newCount = products.filter(p => p.isNew).length

    return (
        <div className="space-y-4">
            {/* ── Toolbar ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    {isPending && (
                        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                    )}
                    <Input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="ابحث بالاسم، الرقم، البراند..."
                        className={cn("pr-9 pl-9 h-10 rounded-xl border-border/50", isPending && "opacity-70")}
                    />
                    {search && (
                        <button
                            onClick={() => handleSearch("")}
                            className="absolute left-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">عرض:</span>
                    {[
                        { label: "الكل", value: undefined },
                        { label: "الجديدة فقط", value: true },
                        { label: "غير الجديدة", value: false },
                    ].map(opt => (
                        <button
                            key={String(opt.value)}
                            onClick={() => handleFilterNew(opt.value)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                filterNew === opt.value
                                    ? opt.value === true
                                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 shadow-sm"
                                        : opt.value === false
                                            ? "bg-muted text-foreground border-border/60 shadow-sm"
                                            : "bg-primary/10 text-primary border-primary/30 shadow-sm"
                                    : "text-muted-foreground border-border/40 hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className={cn("rounded-2xl border border-border/50 overflow-hidden shadow-sm bg-card transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border/50">
                                <th className="px-4 py-3 text-center w-[60px]">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">جديد</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 w-[70px]" />
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">الاسم</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider w-[160px]">البراند</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider w-[150px]">رقم المنتج</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-14 w-14 rounded-full bg-muted/30 flex items-center justify-center">
                                                <Package className="h-7 w-7 text-muted-foreground/30" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">لا توجد منتجات مطابقة</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map(p => (
                                    <ProductRow key={p.id} product={p} onToggle={handleToggle} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="border-t border-border/50 bg-muted/10 flex items-center justify-between px-4 py-2">
                    <p className="text-xs text-muted-foreground">
                        محدد في هذه الصفحة:{" "}
                        <span className="font-bold text-emerald-600">{newCount}</span>
                        {" "}من{" "}
                        <span className="font-bold text-foreground">{products.length}</span>
                    </p>
                    <ServerPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onLimitChange={handleLimitChange}
                        limitOptions={[25, 50, 100, 200]}
                        className="border-0 bg-transparent shadow-none py-0"
                    />
                </div>
            </div>
        </div>
    )
}
