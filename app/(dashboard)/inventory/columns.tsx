"use client"

import type { Product } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
    Wand2,
    Edit,
    Trash2,
    Package,
    Box,
    Loader2,
    MoreHorizontal,
    ChevronRight,
    ChevronDown
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AvailabilityToggle } from "@/components/inventory/availability-toggle"
import { ProductSheet } from "@/components/inventory/product-sheet"
import { generateProductDescription } from "@/lib/actions/ai"
import { deleteProduct } from "@/lib/actions/inventory"
import { VariantsList } from "@/components/inventory/variants-list"

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
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

// --- Component: ActionCell ---
// Handles local state for actions (loading, dialogs)
const ActionCell = ({ product }: { product: Product }) => {

    const [isDeleting, setIsDeleting] = useState(false)



    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteProduct(product.id)
            if (res.success) {
                toast.success('تم حذف المنتج بنجاح')
            } else {
                toast.error(res.error || 'فشل حذف المنتج')
            }
        } catch (error) {
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
                                سيؤدي هذا الإجراء إلى حذف المنتج "{product.name}" نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.
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

// --- Helper: Get Tier Styles ---
const getTierBadgeProps = (tier: string | null) => {
    switch (tier?.toUpperCase()) {
        case 'A':
            return { className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100", label: "Tier A" }
        case 'B':
            return { className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100", label: "Tier B" }
        case 'C':
            return { className: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100", label: "Tier C" }
        default:
            return { className: "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-50", label: tier || "-" }
    }
}

// --- Table Columns Definition ---
export const columns: ColumnDef<Product>[] = [
    {
        id: "expander",
        header: () => null,
        cell: ({ row }) => {
            const hasVariants = (row.original as any).variants?.length > 0;
            if (!hasVariants) return null;

            return (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full p-0 hover:bg-muted"
                    onClick={() => row.toggleExpanded()}
                >
                    {row.getIsExpanded() ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    )}
                </Button>
            )
        },
        enableSorting: false,
        size: 40,
    },
    {
        accessorKey: "name",
        header: "بيانات الصنف",
        cell: ({ row }) => {
            const product = row.original
            return (
                <div className="flex items-center gap-4">
                    {/* Product Image Section */}
                    {product.imagePath ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted/20 cursor-zoom-in group transition-all hover:ring-2 hover:ring-primary/20">
                                    <Image
                                        src={product.imagePath}
                                        alt={product.name}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                <div className="relative aspect-square w-full max-h-[80vh]">
                                    <Image
                                        src={product.imagePath}
                                        alt={product.name}
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <div className="h-14 w-14 shrink-0 rounded-xl bg-muted/30 border border-dashed flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                    )}

                    {/* Product Details Section - Wrapped in Link */}
                    <Link
                        href={`/inventory/${product.id}`}
                        className="flex flex-col gap-1 min-w-0 group/link"
                    >
                        <span className="font-bold text-sm text-foreground truncate group-hover/link:text-primary transition-colors">
                            {product.name}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-mono">
                                ID: {product.itemNumber}
                            </span>
                            {/* Variants Badge */}
                            {(product as any).variants?.length > 0 && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge
                                                variant="secondary"
                                                className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    row.toggleExpanded()
                                                }}
                                            >
                                                {(product as any).variants.length} خيارات
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="flex flex-col gap-1 text-xs">
                                                {(product as any).variants.map((v: any, i: number) => (
                                                    <span key={i} className="flex items-center gap-2">
                                                        <span>{v.name}</span>
                                                        {v.price && <span className="opacity-70">({Number(v.price).toFixed(2)} ر.ي)</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </Link>
                </div>
            )
        },
    },
    {
        accessorKey: "category",
        header: "المجموعة",
        enableGrouping: true,
        cell: ({ row }) => {
            const category = (row.original as any).category
            return (
                <div className="flex items-center">
                    {category ? (
                        <Badge variant="outline" className="px-2 py-1 text-xs bg-secondary/30 text-secondary-foreground font-medium border-secondary/20 hover:bg-secondary/40">
                            {category.icon && <span className="mr-1">{category.icon}</span>}
                            {category.name}
                        </Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">غير محدد</span>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "brand",
        header: "البراند",
        enableGrouping: true,
        cell: ({ row }) => {
            const brand = (row.original as any).brand
            return (
                <div className="flex items-center">
                    {brand ? (
                        <Badge variant="outline" className="px-2 py-1 text-xs bg-primary/10 text-primary font-medium border-primary/20 hover:bg-primary/20">
                            {brand}
                        </Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "unit",
        header: "الوحدة والعبوة",
        enableGrouping: true,
        cell: ({ row }) => {
            const product = row.original
            return (
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Box className="h-3.5 w-3.5 text-muted-foreground" />
                        {product.unit}
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {product.packaging || "-"}
                    </span>
                </div>
            )
        }
    },
    {
        accessorKey: "tier",
        header: "المستوى",
        enableGrouping: true,
        cell: ({ row }) => {
            const props = getTierBadgeProps(row.original.tier)
            return (
                <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border ${props.className}`}>
                    {props.label}
                </Badge>
            )
        }
    },
    {
        accessorKey: "price",
        header: "السعر",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("price"))
            return (
                <div className="flex items-baseline gap-1">
                    <span className="font-mono text-base font-bold tabular-nums text-foreground">
                        {amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">ر.ي</span>
                </div>
            )
        },
    },
    {
        accessorKey: "isAvailable",
        header: "الحالة",
        enableGrouping: true,
        cell: ({ row }) => (
            <AvailabilityToggle
                id={row.original.id}
                isAvailable={row.getValue("isAvailable")}
            />
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-right">الإجراءات</div>,
        cell: ({ row }) => <ActionCell product={row.original} />,
        enableHiding: false,
    },
]