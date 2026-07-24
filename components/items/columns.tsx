"use client"

import type { SerializedItem } from "@/lib/types/item"
import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import Link from "next/link"
import { Edit, Trash2, Loader2, ExternalLink, MoreHorizontal, Tags } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ItemSheet } from "@/components/items/item-sheet"
import { ItemPricingSheet } from "@/components/items/item-pricing-sheet"
import { ItemImageCell } from "@/components/items/table/item-image-cell"
import { AltNameBadgeGroup } from "@/components/items/table/alt-name-badge-group"
import { QuickAddAlternativeName } from "@/components/items/quick-add-alternative-name"
import { deleteItem, toggleItemAvailability } from "@/lib/actions/items"
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

function AvailabilityToggle({ item, onUpdated }: { item: SerializedItem; onUpdated?: () => void }) {
    const [pending, setPending] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const available = pending ?? item.isAvailable

    async function handleToggle(checked: boolean) {
        setPending(checked)
        setLoading(true)
        const res = await toggleItemAvailability(item.id, checked)
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
    item,
    onUpdated,
}: {
    item: SerializedItem
    onUpdated?: () => void
}) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const router = useRouter()
    const displayName = item.displayName || item.name

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteItem(item.id)
            if (res.success) {
                toast.success("تم حذف الصنف بنجاح")
                setDeleteOpen(false)
                onUpdated?.()
                router.refresh()
            } else {
                toast.error(res.error || "فشل حذف الصنف")
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
                        aria-label={`إجراءات ${displayName}`}
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
                        <Link href={`/items/${item.id}`} className="cursor-pointer">
                            <ExternalLink className="h-4 w-4 ml-2" />
                            التفاصيل
                        </Link>
                    </DropdownMenuItem>
                    <ItemSheet
                        item={item}
                        trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="h-4 w-4 ml-2" />
                                تعديل
                            </DropdownMenuItem>
                        }
                    />
                    <ItemPricingSheet
                        itemId={item.id}
                        label={displayName}
                        itemUnits={item.itemUnits}
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
                        <AlertDialogTitle>حذف الصنف؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيتم حذف &quot;{displayName}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
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

export const columns: ColumnDef<SerializedItem>[] = [
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
            const item = row.original
            const primaryImage = item.primaryImage ?? item.mediaImages?.[0]?.url
            return <ItemImageCell src={primaryImage} alt={item.displayName || item.name} />
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
        header: "الصنف",
        size: 280,
        minSize: 220,
        cell: ({ row, table }) => {
            const item = row.original
            const variantTitle = formatItemTitle(item.itemAttributes)
            const altNames = item.alternativeNames ?? []
            const onRefresh = (table.options.meta as { onRefresh?: () => void })?.onRefresh
            return (
                <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                        <Link
                            href={`/items/${item.id}`}
                            className="font-bold text-sm truncate hover:text-primary transition-colors min-w-0"
                        >
                            {item.name}
                        </Link>
                        <QuickAddAlternativeName
                            itemId={item.id}
                            itemName={item.name}
                            currentAlternativeNames={altNames}
                            onSuccess={onRefresh}
                        />
                    </div>
                    {variantTitle !== '—' && (
                        <span className="text-xs text-muted-foreground truncate">{variantTitle}</span>
                    )}
                    <AltNameBadgeGroup names={altNames} />
                </div>
            )
        },
    },
    {
        accessorKey: "productId",
        id: "product",
        enableColumnFilter: true,
        meta: {
            filterType: "select" as const,
            cellVariant: "text" as const,
            align: "start" as const,
        },
        filterFn: "select",
        header: "المنتج",
        size: 160,
        maxSize: 200,
        cell: ({ row }) => {
            const product = row.original.product
            if (!product) return <span className="text-xs text-muted-foreground">—</span>
            return (
                <span className="text-xs font-medium truncate" title={`${product.name} (${product.code})`}>
                    {product.name}
                    <span className="font-mono text-[10px] text-muted-foreground mr-1" dir="ltr">
                        ({product.code})
                    </span>
                </span>
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
            const item = row.original
            return (
                <ItemPricingSheet
                    itemId={item.id}
                    label={item.displayName || item.name}
                    itemUnits={item.itemUnits}
                    onUpdated={() => (table.options.meta as { onRefresh?: () => void })?.onRefresh?.()}
                    trigger={
                        <Badge variant="secondary" className="cursor-pointer font-mono">
                            {item.priceCount}
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
                item={row.original}
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
                item={row.original}
                onUpdated={() => (table.options.meta as { onRefresh?: () => void })?.onRefresh?.()}
            />
        ),
    },
]
