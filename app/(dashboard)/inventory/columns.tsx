"use client"

import type { SerializedProduct } from "@/lib/actions/inventory"
import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import Link from "next/link"
import {
    Edit,
    Trash2,
    Loader2,
    SearchCheck,
    Layers,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AvailabilityToggle } from "@/components/inventory/availability-toggle"
import { ProductSheet } from "@/components/inventory/product-sheet"
import { AltNameBadgeGroup } from "@/components/inventory/table/alt-name-badge-group"
import { ProductImageCell } from "@/components/inventory/table/product-image-cell"
import { deleteProduct } from "@/lib/actions/inventory"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// ─── Sub-components ──────────────────────────────────────────
// Note: CopyableBadge, AltNameBadgeGroup and ProductImageCell are
// imported from @/components/inventory/table/

/** Color dot indicators for variants */
function VariantColorDots({ product, onToggle }: { product: SerializedProduct; onToggle: () => void }) {
    if (!product.variants?.length) return null

    return (
        <div className="flex items-center gap-1 mt-1.5 px-0.5">
            <TooltipProvider delayDuration={0}>
                {product.variants.slice(0, 6).map((variant, idx) => (
                    <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                            <div
                                className="h-4.5 w-4.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 transition-all hover:scale-125 hover:ring-primary/50 hover:z-10 -ml-1 first:ml-0"
                                style={{ backgroundColor: variant.hex || '#9ca3af' }}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{variant.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{variant.variantNumber}</span>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ))}
                {product.variants.length > 6 && (
                    <div className="text-[9px] font-bold text-muted-foreground bg-muted h-4.5 w-4.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 flex items-center justify-center -ml-1">
                        +{product.variants.length - 6}
                    </div>
                )}
            </TooltipProvider>
        </div>
    )
}




// ─── ActionCell ──────────────────────────────────────────────

function ActionCell({ product, onDeleted }: { product: SerializedProduct; onDeleted?: () => void }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteProduct(product.id)
            if (res.success) {
                toast.success('تم حذف المنتج بنجاح')
                // Trigger table refresh so the deleted row disappears
                onDeleted?.()
                router.refresh()
            } else {
                toast.error(res.error || 'فشل حذف المنتج')
            }
        } catch {
            toast.error('حدث خطأ أثناء الحذف')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <TooltipProvider delayDuration={0}>
                {/* Edit Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <ProductSheet
                                product={product}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">تعديل الصنف</TooltipContent>
                </Tooltip>

                {/* Delete Button with Confirmation */}
                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">حذف</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيؤدي هذا الإجراء إلى حذف المنتج &quot;{product.name}&quot; نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            >
                                تأكيد الحذف
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>
        </div>
    )
}

// ─── Table Columns ───────────────────────────────────────────

export const columns: ColumnDef<SerializedProduct>[] = [


    // ── Image ─────────────────────────────────────────────
    {
        id: "image",
        enableColumnFilter: false,
        header: "",
        size: 70,
        minSize: 70,
        maxSize: 70,
        cell: ({ row }) => {
            const product = row.original
            const primaryImage = product.mediaImages?.find(i => i.isPrimary)?.url ?? product.mediaImages?.[0]?.url
            return <ProductImageCell src={primaryImage} alt={product.name} />
        },
    },

    // ── Product Name ──────────────────────────────────────
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث باسم الصنف...' },
        header: "الاسم",
        size: 250,
        minSize: 200,
        cell: ({ row }) => {
            const product = row.original
            const altNames = product.alternativeNames
            return (
                <div className="flex flex-col gap-0 min-w-0 group/link">
                    <div className="flex items-center gap-1.5">
                        <Link
                            href={`/inventory/${product.id}`}
                            className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors decoration-primary/30 underline-offset-4 hover:underline"
                        >
                            {product.name}
                        </Link>
                        {/* Match via Alternative Name Indicator */}
                        {(row as any).matchedViaAlternativeName && (
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge
                                            variant="outline"
                                            className="px-1.5 py-0.5 text-[11px] bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-help shrink-0"
                                        >
                                            <SearchCheck className="h-3 w-3" />
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold">تم العثور عليه عبر اسم بديل:</span>
                                            <span className="text-green-600">"{(row as any).matchedViaAlternativeName}"</span>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <AltNameBadgeGroup names={altNames} />
                </div>
            )
        },
    },

    // ── Variants ──────────────────────────────────────────
    {
        id: "variants",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'عدد الخيارات...' },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const count = (row.original as any).variants?.length ?? 0
            return String(count).includes(filterValue)
        },
        header: "الخيارات",
        size: 150,
        minSize: 120,
        cell: ({ row }) => {
            const product = row.original
            if (!product.variants?.length) return <span className="text-xs text-muted-foreground">—</span>

            return (
                <div className="flex flex-col gap-1 items-start">
                    <Badge
                        variant="secondary"
                        className="px-1.5 py-0.5 text-[11px] bg-primary/5 text-primary border border-primary/10"
                    >
                        {product.variants.length} خيارات
                    </Badge>
                    <VariantColorDots product={product} onToggle={() => {}} />
                </div>
            )
        },
    },

    // ── Product Code ──────────────────────────────────────
    {
        accessorKey: "productCode",
        id: "productCode",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'الرقم المركب...' },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const code = (row.original as any).productCode as string | undefined
            return code?.toLowerCase().includes(filterValue.toLowerCase()) ?? false
        },
        header: "الرقم المركب",
        size: 150,
        maxSize: 170,
        cell: ({ row }) => {
            const product = row.original
            const code = (product as any).productCode as string | undefined
            if (!code) return <span className="text-xs text-muted-foreground">—</span>

            return (
                <span className="text-xs text-foreground font-mono">
                    {code}
                </span>
            )
        },
    },

    // ── Item Number ──────────────────────────────────────
    {
        accessorKey: "itemNumber",
        id: "itemNumber",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'رقم الصنف...' },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const num = (row.original as any).itemNumber as string | undefined
            return num?.toLowerCase().includes(filterValue.toLowerCase()) ?? false
        },
        header: "رقم الصنف",
        size: 130,
        maxSize: 150,
        cell: ({ row }) => {
            const product = row.original
            const itemNumber = (product as any).itemNumber as string | undefined
            if (!itemNumber) return <span className="text-xs text-muted-foreground">—</span>

            return (
                <span className="text-xs text-foreground font-mono">
                    {itemNumber}
                </span>
            )
        },
    },

    // ── Category ──────────────────────────────────────────
    {
        accessorKey: "categoryId",
        id: "category",
        enableColumnFilter: true,
        meta: { filterType: 'select' as const },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return row.original.categoryId === filterValue
        },
        header: "التصنيف",
        size: 140,
        maxSize: 170,
        cell: ({ row }) => {
            const cat = row.original.category
            if (!cat) return <span className="text-xs text-muted-foreground">—</span>

            return (
                <div className="flex items-center gap-2">
                    {cat.icon ? (
                        <span className="text-base shrink-0">{cat.icon}</span>
                    ) : (
                        <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </div>
                    )}
                    <span className="text-xs font-medium truncate max-w-[70px]" title={cat.name}>
                        {cat.name}
                    </span>
                </div>
            )
        },
    },

    // ── Brand ─────────────────────────────────────────────
    {
        accessorKey: "brandId",
        id: "brand",
        enableColumnFilter: true,
        meta: { filterType: 'select' as const },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return row.original.brandId === filterValue
        },
        header: "البراند",
        size: 140,
        maxSize: 170,
        cell: ({ row }) => {
            const brand = row.original.brandRef
            if (!brand) return <span className="text-xs text-muted-foreground">—</span>

            const gradients = [
                "from-violet-500 to-purple-600",
                "from-blue-500  to-cyan-600",
                "from-emerald-500 to-teal-600",
                "from-orange-500 to-amber-600",
                "from-rose-500  to-pink-600",
            ]
            const gradient = gradients[brand.name.charCodeAt(0) % gradients.length]

            return (
                <div className="flex items-center gap-2">
                    {brand.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={brand.logo}
                            alt={brand.name}
                            className="h-6 w-6 rounded-md object-contain border border-border/40 bg-white p-0.5 shrink-0"
                        />
                    ) : (
                        <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                            {brand.code}
                        </div>
                    )}
                    <span className="text-xs font-medium truncate max-w-[70px]" title={brand.name}>
                        {brand.name}
                    </span>
                </div>
            )
        },
    },



    // ── Availability ──────────────────────────────────────
    {
        accessorKey: "isAvailable",
        enableColumnFilter: true,
        meta: { filterType: 'select' as const },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return String(row.original.isAvailable) === filterValue
        },
        header: "الحالة",
        enableGrouping: true,
        size: 120,
        maxSize: 140,
        cell: ({ row }) => (
            <AvailabilityToggle
                id={row.original.id}
                isAvailable={row.getValue("isAvailable")}
                hasPrices={(row.original.productPrices?.length ?? 0) > 0}
                hasUnits={(row.original.productUnits?.length ?? 0) > 0}
            />
        ),
    },

    // ── Actions ───────────────────────────────────────────
    {
        id: "actions",
        enableColumnFilter: false,
        header: () => <div className="text-right">الإجراءات</div>,
        cell: ({ row, table }) => (
            <ActionCell
                product={row.original}
                onDeleted={() => (table.options.meta as any)?.onRefresh?.()}
            />
        ),
        enableHiding: false,
        size: 90,
        maxSize: 100,
    },
]