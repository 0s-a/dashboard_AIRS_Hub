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
    ChevronDown,
    Plus,
    SearchCheck,
    Copy,
    Check
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

// Custom Global Filter Function for Smart Search
export const customGlobalFilterFn = (row: any, columnId: string, filterValue: string) => {
    const searchValue = filterValue.toLowerCase().trim()
    if (!searchValue) return true

    const product = row.original

    // Primary fields
    if (product.name?.toLowerCase().includes(searchValue)) return true
    if (product.itemNumber?.toLowerCase().includes(searchValue)) return true
    if (product.brand?.toLowerCase().includes(searchValue)) return true
    if (product.description?.toLowerCase().includes(searchValue)) return true
    if (product.category?.name?.toLowerCase().includes(searchValue)) return true

    // Tags (JSON array)
    if (Array.isArray(product.tags)) {
        if (product.tags.some((tag: string) => tag.toLowerCase().includes(searchValue))) return true
    }

    // Alternative names (JSON array)
    if (Array.isArray(product.alternativeNames)) {
        if (product.alternativeNames.some((name: string) => name.toLowerCase().includes(searchValue))) return true
    }

    // Variant names & numbers
    if (Array.isArray(product.variants)) {
        if (product.variants.some((v: any) =>
            v.name?.toLowerCase().includes(searchValue) ||
            v.variantNumber?.toLowerCase().includes(searchValue) ||
            v.suffix?.toLowerCase().includes(searchValue)
        )) return true
    }

    return false
}

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
                    {(() => {
                        const mediaImages = (product as any).mediaImages as Array<{ url: string; isPrimary: boolean }> | null
                        const src = mediaImages?.find(i => i.isPrimary)?.url ?? mediaImages?.[0]?.url
                        return src ? (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border bg-muted/20 cursor-zoom-in group transition-all hover:ring-2 hover:ring-primary/40 shadow-sm">
                                        <Image
                                            src={src}
                                            alt={product.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                    <div className="relative aspect-square w-full max-h-[80vh]">
                                        <Image
                                            src={src}
                                            alt={product.name}
                                            fill
                                            className="object-contain"
                                            priority
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/30 border border-dashed flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                        )
                    })()}

                    {/* Product Details Section - Wrapped in Link */}
                    <div
                        className="flex flex-col gap-0.5 min-w-0 group/link"
                    >
                        <div className="flex items-center gap-1.5">
                            <Link
                                href={`/inventory/${product.id}`}
                                className="font-bold text-[13px] text-foreground truncate hover:text-primary transition-colors decoration-primary/30 underline-offset-4 hover:underline"
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
                                                className="px-1.5 py-0 text-[10px] bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-help shrink-0"
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
                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                            <div className="flex items-center gap-1 group/copy cursor-pointer bg-muted/40 hover:bg-muted/60 px-1.5 py-0.5 rounded transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(product.itemNumber);
                                    toast.success('تم نسخ رقم الصنف');
                                }}
                            >
                                <span className="text-muted-foreground font-mono">
                                    {product.itemNumber}
                                </span>
                                <Copy className="h-2.5 w-2.5 text-muted-foreground/50 group-hover/copy:text-primary transition-colors" />
                            </div>
                            
                            {/* Variants Badge */}
                            {(product as any).variants?.length > 0 && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge
                                                variant="secondary"
                                                className="px-1.5 py-0 text-[10px] bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 cursor-pointer"
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
                                                {(product as any).variants.map((v: any, i: number) => {
                                                    const priceToUse = v.price || (product as any).productPrices?.[0]?.value;
                                                    return (
                                                        <span key={i} className="flex items-center justify-between gap-4">
                                                            <span>{v.name}</span>
                                                            {priceToUse && <span className="opacity-70 font-mono">({Number(priceToUse).toLocaleString('en-US')} ر.ي)</span>}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        {/* Alternative Names Display */}
                        {(product as any).alternativeNames && Array.isArray((product as any).alternativeNames) && (product as any).alternativeNames.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {(product as any).alternativeNames.slice(0, 2).map((altName: string, idx: number) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-default"
                                                    >
                                                        {altName}
                                                    </Badge>
                                                ))}
                                                {(product as any).alternativeNames.length > 2 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 cursor-help"
                                                    >
                                                        +{(product as any).alternativeNames.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-xs">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-muted-foreground mb-1">الأسماء البديلة:</span>
                                                {(product as any).alternativeNames.map((altName: string, idx: number) => (
                                                    <span key={idx} className="text-xs">• {altName}</span>
                                                ))}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}
                        {/* Variants Dots Display */}
                        {(product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 px-0.5">
                                <TooltipProvider delayDuration={0}>
                                    {(product as any).variants.slice(0, 6).map((variant: any, idx: number) => (
                                        <Tooltip key={idx}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className="h-4.5 w-4.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 cursor-pointer transition-all hover:scale-125 hover:ring-primary/50 hover:z-10 -ml-1 first:ml-0"
                                                    style={{ backgroundColor: variant.hex || '#9ca3af' }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        row.toggleExpanded();
                                                    }}
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
                                    {(product as any).variants.length > 6 && (
                                        <div className="text-[9px] font-bold text-muted-foreground bg-muted h-4.5 w-4.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 flex items-center justify-center -ml-1">
                                            +{(product as any).variants.length - 6}
                                        </div>
                                    )}
                                </TooltipProvider>
                            </div>
                        )}
                    </div>
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
        accessorKey: "productPrices",
        header: "الأسعار",
        cell: ({ row }) => {
            const product = row.original;
            const prices: Array<{ 
                id: string; 
                priceLabelName: string; 
                value: number; 
                currencySymbol: string; 
                unit: string | null; 
                quantity: number | null 
            }> = (product as any).productPrices || []
            
            if (prices.length === 0) {
                return <span className="text-muted-foreground text-[11px] italic">لا يوجد تسعير</span>
            }

            // Group prices by priceLabelName
            const groupedPrices = prices.reduce((acc, price) => {
                if (!acc[price.priceLabelName]) {
                    acc[price.priceLabelName] = [];
                }
                acc[price.priceLabelName].push(price);
                return acc;
            }, {} as Record<string, typeof prices>);

            return (
                <div className="flex flex-col gap-1.5 w-full min-w-[130px]">
                    {Object.entries(groupedPrices).map(([labelName, labelPrices], idx) => (
                        <div 
                            key={labelName} 
                            className={cn(
                                "flex flex-col gap-1 px-2.5 py-1.5 rounded-lg border transition-colors w-full",
                                idx === 0 
                                    ? "bg-linear-to-r from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 border-emerald-500/30 shadow-xs" 
                                    : "bg-muted/30 hover:bg-muted/50 border-border/40"
                            )}
                        >
                            <div className="flex items-center justify-between gap-2 border-b border-border/10 pb-0.5 mb-0.5">
                                <span className={cn(
                                    "text-[10px] truncate",
                                    idx === 0 ? "font-bold text-emerald-700/90" : "font-semibold text-foreground/80"
                                )} title={labelName}>
                                    {labelName}
                                </span>
                                {labelPrices[0].unit && (
                                    <span className="text-[9px] text-muted-foreground/80 truncate">
                                        {labelPrices[0].quantity ? `${labelPrices[0].quantity} ` : ''}{labelPrices[0].unit}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {labelPrices.map((p) => (
                                    <div key={p.id} className="flex items-baseline gap-1">
                                        <span className={cn(
                                            "font-mono tabular-nums",
                                            idx === 0 ? "text-[13px] font-extrabold text-emerald-700" : "text-[11px] font-bold text-foreground/90"
                                        )}>
                                            {Number(p.value).toLocaleString('en-US')}
                                        </span>
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase",
                                            idx === 0 ? "text-emerald-600/80" : "text-muted-foreground/80"
                                        )}>
                                            {p.currencySymbol}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
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