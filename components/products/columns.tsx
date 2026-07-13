"use client"

import type { SerializedProduct } from "@/lib/actions/inventory"
import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import Link from "next/link"
import { Edit, Trash2, Loader2, ExternalLink, MoreHorizontal, Tags } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ProductSheet } from "@/components/inventory/product-sheet"
import { ProductPricingSheet } from "@/components/products/product-pricing-sheet"
import { ProductImageCell } from "@/components/inventory/table/product-image-cell"
import { deleteProduct, toggleProductAvailability } from "@/lib/actions/inventory"
import { formatItemTitle, INVENTORY_LABELS } from "@/lib/config/inventory-labels"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function AvailabilityToggle({ product, onUpdated }: { product: SerializedProduct; onUpdated?: () => void }) {
    const [pending, setPending] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const available = pending ?? product.isAvailable

    async function handleToggle(checked: boolean) {
        setPending(checked)
        setLoading(true)
        const res = await toggleProductAvailability(product.id, checked)
        setLoading(false)
        setPending(null)
        if (res.success) {
            onUpdated?.()
        } else {
            toast.error(res.error || "فشل تحديث التوفر")
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Switch checked={available} onCheckedChange={handleToggle} disabled={loading} />
            <span className="text-xs text-muted-foreground">{available ? "متوفر" : "غير متوفر"}</span>
        </div>
    )
}

function ActionCell({
    product,
    onUpdated,
}: {
    product: SerializedProduct
    onUpdated?: () => void
}) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteProduct(product.id)
            if (res.success) {
                toast.success("تم حذف المنتج بنجاح")
                setDeleteOpen(false)
                onUpdated?.()
                router.refresh()
            } else {
                toast.error(res.error || "فشل حذف المنتج")
            }
        } catch {
            toast.error("حدث خطأ أثناء الحذف")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`إجراءات ${product.name}`}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                        الإجراءات
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}`} className="cursor-pointer">
                            <ExternalLink className="h-4 w-4 ml-2" />
                            التفاصيل
                        </Link>
                    </DropdownMenuItem>
                    <ProductSheet
                        product={product}
                        trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="h-4 w-4 ml-2" />
                                تعديل
                            </DropdownMenuItem>
                        }
                    />
                    <ProductPricingSheet
                        productId={product.id}
                        label={product.name}
                        productUnits={product.productUnits}
                        onUpdated={() => onUpdated?.()}
                        trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Tags className="h-4 w-4 ml-2" />
                                الأسعار
                            </DropdownMenuItem>
                        }
                    />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف المنتج؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيتم حذف &quot;{product.name}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export const columns: ColumnDef<SerializedProduct>[] = [
    {
        id: "image",
        enableColumnFilter: false,
        enableSorting: false,
        header: "",
        size: 70,
        minSize: 70,
        maxSize: 70,
        meta: { align: "center" as const },
        cell: ({ row }) => {
            const product = row.original
            const primaryImage = product.primaryImage ?? product.mediaImages?.[0]?.url
            return <ProductImageCell src={primaryImage} alt={product.name} />
        },
    },
    {
        accessorKey: "name",
        id: "name",
        enableColumnFilter: false,
        meta: {
            filterType: "text" as const,
            filterPlaceholder: "ابحث بالاسم...",
            cellVariant: "text" as const,
            align: "start" as const,
        },
        header: "المنتج",
        size: 260,
        minSize: 200,
        cell: ({ row }) => {
            const product = row.original
            const variantTitle = formatItemTitle(product.productAttributes)
            return (
                <Link href={`/products/${product.id}`} className="flex flex-col gap-0.5 min-w-0 hover:text-primary transition-colors">
                    <span className="font-bold text-sm truncate">{product.name}</span>
                    {variantTitle !== '—' && (
                        <span className="text-xs text-muted-foreground truncate">{variantTitle}</span>
                    )}
                </Link>
            )
        },
    },
    {
        accessorKey: "brandId",
        id: "brand",
        enableColumnFilter: true,
        meta: {
            filterType: "select" as const,
            cellVariant: "text" as const,
            align: "start" as const,
        },
        filterFn: "select",
        header: "البراند",
        size: 140,
        maxSize: 170,
        cell: ({ row }) => {
            const brand = row.original.brandRef
            return (
                <span className="text-xs font-medium truncate" title={brand.name}>
                    {brand.name}
                </span>
            )
        },
    },
    {
        accessorKey: "categoryId",
        id: "category",
        enableColumnFilter: true,
        meta: {
            filterType: "select" as const,
            cellVariant: "text" as const,
            align: "start" as const,
        },
        filterFn: "select",
        header: "التصنيف",
        size: 140,
        maxSize: 170,
        cell: ({ row }) => {
            const cat = row.original.category
            return (
                <span className="text-xs font-medium truncate" title={cat.name}>
                    {cat.name}
                </span>
            )
        },
    },
    {
        accessorKey: "itemNumber",
        id: "itemNumber",
        enableColumnFilter: false,
        meta: {
            filterType: "text" as const,
            filterPlaceholder: "رقم الصنف...",
            cellVariant: "code" as const,
            align: "start" as const,
        },
        header: () => INVENTORY_LABELS.itemNumber,
        size: 120,
        cell: ({ row }) => (
            <span className="truncate">{row.original.itemNumber}</span>
        ),
    },
    {
        id: "prices",
        enableColumnFilter: false,
        meta: { align: "center" as const, cellVariant: "number" as const },
        header: "الأسعار",
        size: 90,
        cell: ({ row, table }) => {
            const product = row.original
            return (
                <ProductPricingSheet
                    productId={product.id}
                    label={product.name}
                    productUnits={product.productUnits}
                    onUpdated={() => (table.options.meta as { onRefresh?: () => void })?.onRefresh?.()}
                    trigger={
                        <Badge variant="secondary" className="cursor-pointer font-mono">
                            {product.priceCount}
                        </Badge>
                    }
                />
            )
        },
    },
    {
        id: "availability",
        enableColumnFilter: false,
        meta: { align: "start" as const },
        header: "التوفر",
        size: 110,
        cell: ({ row, table }) => (
            <AvailabilityToggle
                product={row.original}
                onUpdated={() => (table.options.meta as { onRefresh?: () => void })?.onRefresh?.()}
            />
        ),
    },
    {
        id: "actions",
        enableColumnFilter: false,
        enableSorting: false,
        enableHiding: false,
        meta: { cellVariant: "actions" as const, sticky: "actions" as const, align: "end" as const },
        header: "",
        size: 56,
        minSize: 56,
        maxSize: 64,
        cell: ({ row, table }) => (
            <ActionCell
                product={row.original}
                onUpdated={() => (table.options.meta as { onRefresh?: () => void })?.onRefresh?.()}
            />
        ),
    },
]
