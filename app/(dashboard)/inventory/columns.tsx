"use client"

import type { SerializedProduct } from "@/lib/actions/inventory"
import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
    Edit,
    Trash2,
    Package,
    Loader2,
    ChevronRight,
    ChevronDown,
    SearchCheck,
    Copy,
    Check,
    Layers,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AvailabilityToggle } from "@/components/inventory/availability-toggle"
import { ProductSheet } from "@/components/inventory/product-sheet"
import { deleteProduct } from "@/lib/actions/inventory"

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

// ─── Sub-components ──────────────────────────────────────────

/** Copyable item number with animated check icon */
function CopyableItemNumber({ itemNumber }: { itemNumber: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        navigator.clipboard.writeText(itemNumber)
        setCopied(true)
        toast.success('تم نسخ رقم الصنف')
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div
            className="flex items-center gap-1 group/copy cursor-pointer bg-muted/40 hover:bg-muted/60 px-1.5 py-0.5 rounded transition-colors"
            onClick={handleCopy}
        >
            <span className="text-muted-foreground font-mono">
                {itemNumber}
            </span>
            {copied ? (
                <Check className="h-2.5 w-2.5 text-emerald-600 transition-colors" />
            ) : (
                <Copy className="h-2.5 w-2.5 text-muted-foreground/50 group-hover/copy:text-primary transition-colors" />
            )}
        </div>
    )
}

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
                                className="h-4.5 w-4.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 cursor-pointer transition-all hover:scale-125 hover:ring-primary/50 hover:z-10 -ml-1 first:ml-0"
                                style={{ backgroundColor: variant.hex || '#9ca3af' }}
                                onClick={(e) => {
                                    e.preventDefault()
                                    onToggle()
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
                {product.variants.length > 6 && (
                    <div className="text-[9px] font-bold text-muted-foreground bg-muted h-4.5 w-4.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 flex items-center justify-center -ml-1">
                        +{product.variants.length - 6}
                    </div>
                )}
            </TooltipProvider>
        </div>
    )
}

/** Alternative names badges with tooltip */
function AlternativeNamesBadges({ names }: { names: string[] }) {
    if (!names?.length) return null

    return (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 flex-wrap">
                            {names.slice(0, 2).map((altName, idx) => (
                                <Badge
                                    key={idx}
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-default"
                                >
                                    {altName}
                                </Badge>
                            ))}
                            {names.length > 2 && (
                                <Badge
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 cursor-help"
                                >
                                    +{names.length - 2}
                                </Badge>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-muted-foreground mb-1">الأسماء البديلة:</span>
                            {names.map((altName, idx) => (
                                <span key={idx} className="text-xs">• {altName}</span>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

/** Product image thumbnail with zoom dialog */
function ProductImageCell({ src, alt }: { src: string | undefined; alt: string }) {
    if (!src) {
        return (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/30 border border-dashed flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground/30" />
            </div>
        )
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border bg-muted/20 cursor-zoom-in group transition-all hover:ring-2 hover:ring-primary/40 shadow-sm">
                    <Image
                        src={src}
                        alt={alt}
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
                        alt={alt}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── ProductNameCell ─────────────────────────────────────────

function ProductNameCell({ product, row }: { product: SerializedProduct; row: any }) {
    const primaryImage = product.mediaImages?.find(i => i.isPrimary)?.url ?? product.mediaImages?.[0]?.url
    const altNames = Array.isArray(product.alternativeNames) ? product.alternativeNames : []

    return (
        <div className="flex items-center gap-3">
            <ProductImageCell src={primaryImage} alt={product.name} />

            <div className="flex flex-col gap-0.5 min-w-0 group/link">
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
                    <CopyableItemNumber itemNumber={product.itemNumber} />

                    {/* Variants Badge */}
                    {product.variants?.length > 0 && (
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
                                        {product.variants.length} خيارات
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="flex flex-col gap-1 text-xs">
                                        {product.variants.map((v, i) => {
                                            const priceToUse = v.price || product.productPrices?.[0]?.value;
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
                <AlternativeNamesBadges names={altNames} />
                <VariantColorDots product={product} onToggle={() => row.toggleExpanded()} />
            </div>
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
    // ── Expander ──────────────────────────────────────────
    {
        id: "expander",
        header: () => null,
        cell: ({ row }) => {
            const hasVariants = row.original.variants?.length > 0;
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
        size: 32,
        maxSize: 32,
    },

    // ── Product Name (main info cell) ─────────────────────
    {
        accessorKey: "name",
        header: "بيانات الصنف",
        size: 350,
        minSize: 250,
        cell: ({ row }) => <ProductNameCell product={row.original} row={row} />,
    },

    // ── Category ──────────────────────────────────────────
    {
        id: "category",
        header: "التصنيف",
        size: 110,
        maxSize: 140,
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
        id: "brand",
        header: "البراند",
        size: 110,
        maxSize: 140,
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

    // ── Prices ────────────────────────────────────────────
    {
        accessorKey: "productPrices",
        header: "الأسعار",
        size: 170,
        minSize: 140,
        cell: ({ row }) => {
            const prices = row.original.productPrices || []

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
                                {labelPrices[0].unitName && (
                                    <span className="text-[9px] text-muted-foreground/80 truncate">
                                        {labelPrices[0].unitName}
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

    // ── Availability ──────────────────────────────────────
    {
        accessorKey: "isAvailable",
        header: "الحالة",
        enableGrouping: true,
        size: 120,
        maxSize: 140,
        cell: ({ row }) => (
            <AvailabilityToggle
                id={row.original.id}
                isAvailable={row.getValue("isAvailable")}
            />
        ),
    },

    // ── Actions ───────────────────────────────────────────
    {
        id: "actions",
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