"use client"

import type { SerializedProduct } from "@/lib/actions/inventory"
import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import Link from "next/link"
import { Edit, Trash2, Loader2, SearchCheck, Layers } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
                        <Link href={`/items?productId=${product.id}`}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                            >
                                <Layers className="h-4 w-4" />
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top">أصناف المنتج</TooltipContent>
                </Tooltip>

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
                    <TooltipContent side="top">تعديل المنتج</TooltipContent>
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
                        <ProductSheet
                            product={product}
                            trigger={
                                <button
                                    type="button"
                                    className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors text-right"
                                >
                                    {product.name}
                                </button>
                            }
                        />
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

    // ── Product Number ────────────────────────────────────
    {
        accessorKey: "productNumber",
        id: "productNumber",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'مثال: 001' },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const num = row.original.productNumber
            return num?.toLowerCase().includes(filterValue.toLowerCase()) ?? false
        },
        header: "رقم المنتج",
        size: 150,
        maxSize: 170,
        cell: ({ row }) => {
            const product = row.original
            if (!product.productNumber) return <span className="text-xs text-muted-foreground">—</span>

            return (
                <span className="text-xs text-foreground font-mono">
                    {product.productNumber}
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