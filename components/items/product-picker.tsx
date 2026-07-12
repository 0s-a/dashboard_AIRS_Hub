"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { getProductsPaginated } from "@/lib/actions/inventory"

const SEARCH_DEBOUNCE_MS = 350

export type ProductOption = {
    id: string
    name: string
    productNumber: string | null
    skuSpecKind?: import('@/lib/config/sku-spec.config').SkuSpecKind
}

interface ProductPickerProps {
    value: ProductOption | null
    onChange: (product: ProductOption | null) => void
    disabled?: boolean
    /** جلب قائمة أولية عند الفتح */
    fetchOnMount?: boolean
}

export function ProductPicker({ value, onChange, disabled, fetchOnMount = true }: ProductPickerProps) {
    const [open, setOpen] = useState(false)
    const [products, setProducts] = useState<ProductOption[]>([])
    const [searching, setSearching] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const searchProducts = useCallback(async (q: string) => {
        setSearching(true)
        const res = await getProductsPaginated({ search: q, limit: 20, page: 1 })
        if (res.success && res.data) {
            setProducts(res.data.map(p => ({
                id: p.id,
                name: p.name,
                productNumber: p.productNumber ?? null,
                skuSpecKind: p.skuSpecKind,
            })))
        }
        setSearching(false)
    }, [])

    useEffect(() => {
        if (fetchOnMount && open && products.length === 0) {
            void searchProducts("")
        }
    }, [fetchOnMount, open, products.length, searchProducts])

    function handleSearchChange(q: string) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            void searchProducts(q)
        }, SEARCH_DEBOUNCE_MS)
    }

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-label="اختيار المنتج"
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {value ? (
                        <span className="truncate">{value.name}</span>
                    ) : (
                        "ابحث عن منتج..."
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="بحث..." onValueChange={handleSearchChange} />
                    <CommandList>
                        {searching && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        )}
                        <CommandEmpty>لا توجد منتجات</CommandEmpty>
                        <CommandGroup>
                            {products.map(p => (
                                <CommandItem
                                    key={p.id}
                                    value={p.id}
                                    onSelect={() => {
                                        onChange(p)
                                        setOpen(false)
                                    }}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate">{p.name}</span>
                                        {p.productNumber && (
                                            <span className="text-xs font-mono text-muted-foreground" dir="ltr">
                                                {p.productNumber}
                                            </span>
                                        )}
                                    </div>
                                    <Check className={cn("mr-auto h-4 w-4 shrink-0", value?.id === p.id ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
