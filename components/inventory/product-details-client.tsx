"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
    ChevronRight,
    ChevronLeft,
    Package,
    Calendar,
    Edit,
    Trash2,
    Tag,
    Layers,
    Box,
    ArrowRight,
    Share2,
    Loader2,
    Palette,
    FileText,
    Plus,
    X,
    Copy,
    Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvailabilityToggle } from "@/components/inventory/availability-toggle"
import { ProductSheet } from "@/components/inventory/product-sheet"
import { QuickAddAlternativeName } from "@/components/inventory/quick-add-alternative-name"
import { QuickAddColor } from "@/components/inventory/quick-add-color"
import { QuickAddVariant } from "@/components/inventory/quick-add-variant"
import { EditColorDialog } from "@/components/inventory/edit-color-dialog"
import { deleteProduct } from "@/lib/actions/inventory"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
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

type ProductData = {
    id: string
    itemNumber: string
    name: string
    brand: string | null
    description: string | null
    unit: string
    tier: string | null
    packaging: string | null
    price: string
    isAvailable: boolean
    imagePath: string | null
    colors: Array<{
        itemNumber: string
        name: string
        code: string
        imagePath: string | null
    }> | null
    images: Array<{
        url: string
        alt?: string
        isPrimary: boolean
        order?: number
    }> | null
    alternativeNames: string[] | null
    createdAt: Date
    updatedAt: Date
    categoryId: string | null
    category: {
        id: string
        name: string
        icon: string | null
    } | null
    variants: Array<{
        id: string
        name: string
        imagePath: string | null
        price: string | null
        createdAt: Date
        updatedAt: Date
    }>
}

interface ProductDetailsClientProps {
    product: ProductData
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [copiedItemNumber, setCopiedItemNumber] = useState(false)

    const copyItemNumber = async () => {
        try {
            await navigator.clipboard.writeText(product.itemNumber)
            setCopiedItemNumber(true)
            setTimeout(() => setCopiedItemNumber(false), 2000)
        } catch {
            // fallback for older browsers
            const el = document.createElement('textarea')
            el.value = product.itemNumber
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setCopiedItemNumber(true)
            setTimeout(() => setCopiedItemNumber(false), 2000)
        }
    }
    const [selectedColor, setSelectedColor] = useState<{
        itemNumber: string
        name: string
        code: string
        imagePath: string | null
    } | null>(null)
    const [editColorOpen, setEditColorOpen] = useState(false)

    // Build gallery images from images array or fallback to imagePath
    const galleryImages = (() => {
        if (product.images && product.images.length > 0) {
            return [...product.images].sort((a, b) => {
                if (a.isPrimary) return -1
                if (b.isPrimary) return 1
                return (a.order ?? 0) - (b.order ?? 0)
            })
        }
        if (product.imagePath) {
            return [{ url: product.imagePath, alt: product.name, isPrimary: true }]
        }
        return []
    })()

    const openLightbox = (index: number) => {
        setLightboxIndex(index)
        setLightboxOpen(true)
    }

    const formatPrice = (price: string) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2
        }).format(Number(price))
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteProduct(product.id)
            if (result.success) {
                toast.success('تم حذف المنتج', { description: `تم حذف "${product.name}" وجميع بياناته نهائياً` })
                router.push('/inventory')
            } else {
                toast.error('فشل حذف المنتج', { description: result.error || 'تعذّر حذف المنتج، يُرجى المحاولة مجدداً' })
                setIsDeleting(false)
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم أثناء محاولة الحذف' })
            setIsDeleting(false)
        }
    }

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            toast.success('تم نسخ الرابط', { description: 'تم نسخ رابط المنتج إلى الحافظة' })
        } catch {
            toast.error('فشل النسخ', { description: 'تعذّر نسخ الرابط، يُرجى نسخه يدوياً من شريط العنوان' })
        }
    }

    const handleBack = () => {
        router.push('/inventory')
    }

    return (
        <div className="space-y-6">
            {/* Header with Breadcrumb and Actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/inventory" className="hover:text-primary transition-colors">المخزون</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground font-medium">{product.name}</span>
                </nav>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="gap-2 hover:bg-primary/5"
                    >
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline">مشاركة</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="gap-2 hover:bg-primary/5"
                    >
                        <ArrowRight className="h-4 w-4" />
                        <span className="hidden sm:inline">رجوع للمخزون</span>
                    </Button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Product Gallery */}
                <div className="glass-panel rounded-2xl p-4 border border-border/50 space-y-3">
                    {/* Hero Image */}
                    <div
                        className="aspect-square relative rounded-xl overflow-hidden bg-muted/30 group cursor-pointer"
                        onClick={() => galleryImages.length > 0 && openLightbox(0)}
                    >
                        {galleryImages.length > 0 ? (
                            <Image
                                src={galleryImages[0].url}
                                alt={galleryImages[0].alt || product.name}
                                fill
                                className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-105"
                                priority
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-linear-to-br from-muted/50 to-muted/20">
                                <Package className="h-24 w-24 text-muted-foreground/30" />
                            </div>
                        )}
                        {galleryImages.length > 0 && (
                            <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                                    اضغط للتكبير
                                </span>
                            </div>
                        )}
                        {/* Image count badge */}
                        {galleryImages.length > 1 && (
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                {galleryImages.length} صور
                            </div>
                        )}
                    </div>

                    {/* Thumbnail Strip */}
                    {galleryImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={img.url}
                                    type="button"
                                    onClick={() => openLightbox(idx)}
                                    className={`relative shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${idx === 0
                                        ? 'border-primary shadow-md shadow-primary/20'
                                        : 'border-border/50 hover:border-primary/50'
                                        }`}
                                >
                                    <Image
                                        src={img.url}
                                        alt={img.alt || `صورة ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lightbox */}
                {lightboxOpen && galleryImages.length > 0 && (
                    <div
                        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                        onClick={() => setLightboxOpen(false)}
                    >
                        {/* Close */}
                        <button
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                            onClick={() => setLightboxOpen(false)}
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {/* Counter */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                            {lightboxIndex + 1} / {galleryImages.length}
                        </div>

                        {/* Prev */}
                        {galleryImages.length > 1 && (
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + galleryImages.length) % galleryImages.length) }}
                            >
                                <ChevronRight className="h-8 w-8" />
                            </button>
                        )}

                        {/* Image */}
                        <div
                            className="relative max-w-4xl max-h-[85vh] w-full h-full mx-16"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={galleryImages[lightboxIndex].url}
                                alt={galleryImages[lightboxIndex].alt || product.name}
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>

                        {/* Next */}
                        {galleryImages.length > 1 && (
                            <button
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % galleryImages.length) }}
                            >
                                <ChevronLeft className="h-8 w-8" />
                            </button>
                        )}

                        {/* Thumbnail strip in lightbox */}
                        {galleryImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {galleryImages.map((img, idx) => (
                                    <button
                                        key={img.url}
                                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx) }}
                                        className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${idx === lightboxIndex ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <div className="relative h-full w-full">
                                            <Image src={img.url} alt="" fill className="object-cover" sizes="48px" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Product Info */}
                <div className="space-y-6">
                    <div className="glass-panel rounded-2xl p-6 border border-border/50 space-y-4 hover:border-primary/20 transition-all duration-300">
                        {/* Title & Badge */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-foreground to-foreground/80 bg-clip-text">
                                    {product.name}
                                </h1>
                                <AvailabilityToggle
                                    id={product.id}
                                    isAvailable={product.isAvailable}
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                    variant="outline"
                                    className="gap-1.5 hover:bg-primary/5 transition-colors cursor-pointer select-none"
                                    onClick={copyItemNumber}
                                    title="انقر لنسخ رقم الصنف"
                                >
                                    <Tag className="h-3 w-3" />
                                    <span className="font-mono">{product.itemNumber}</span>
                                    {copiedItemNumber ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3 text-muted-foreground/50" />
                                    )}
                                </Badge>
                                {product.category && (
                                    <Badge className="gap-1.5 bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all">
                                        <Layers className="h-3 w-3" />
                                        {product.category.name}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Brand */}
                        {product.brand && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                                <span className="text-sm text-muted-foreground">العلامة التجارية:</span>
                                <span className="font-semibold text-primary">{product.brand}</span>
                            </div>
                        )}

                        {/* Description */}
                        {product.description && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground">الوصف</h3>
                                <p className="text-sm leading-relaxed text-foreground/90 p-3 rounded-lg bg-muted/20 border border-border/20">
                                    {product.description}
                                </p>
                            </div>
                        )}

                        {/* Alternative Names Display */}
                        {product.alternativeNames && product.alternativeNames.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <h3 className="text-sm font-semibold text-muted-foreground">الأسماء البديلة</h3>
                                    </div>
                                    <QuickAddAlternativeName
                                        productId={product.id}
                                        productName={product.name}
                                        currentAlternativeNames={product.alternativeNames}
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 text-xs bg-linear-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-300 text-amber-700 hover:text-amber-800 transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5 ml-1" />
                                                إضافة
                                            </Button>
                                        }
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {product.alternativeNames.map((altName, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="outline"
                                            className="px-3 py-1.5 text-sm bg-linear-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200 hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 hover:shadow-md hover:shadow-amber-100 transition-all duration-300 cursor-default hover:-translate-y-0.5"
                                        >
                                            {altName}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Alternative Names - Empty State with Quick Add */}
                        {(!product.alternativeNames || product.alternativeNames.length === 0) && (
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <h3 className="text-sm font-semibold text-muted-foreground">الأسماء البديلة</h3>
                                    </div>
                                    <QuickAddAlternativeName
                                        productId={product.id}
                                        productName={product.name}
                                        currentAlternativeNames={null}
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 text-xs bg-linear-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-300 text-amber-700 hover:text-amber-800 transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5 ml-1" />
                                                إضافة اسم بديل
                                            </Button>
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground italic">لا توجد أسماء بديلة لهذا المنتج</p>
                            </div>
                        )}

                        {/* Colors Display */}
                        {product.colors && product.colors.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Palette className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold text-muted-foreground">الألوان المتاحة</h3>
                                    </div>
                                    <QuickAddColor
                                        productId={product.id}
                                        productName={product.name}
                                        productItemNumber={product.itemNumber}
                                        currentColors={product.colors}
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {product.colors.map((color, idx) => (
                                        <div
                                            key={color.itemNumber || idx}
                                            onClick={() => {
                                                setSelectedColor(color)
                                                setEditColorOpen(true)
                                            }}
                                            className="group relative rounded-xl border border-border/50 overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                                        >
                                            {/* Color Preview Area */}
                                            <div className="aspect-square relative">
                                                {color.imagePath ? (
                                                    <>
                                                        <Image
                                                            src={color.imagePath}
                                                            alt={color.name}
                                                            fill
                                                            className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-105"
                                                        />
                                                        {/* Color swatch badge overlay */}
                                                        <div
                                                            className="absolute top-2 right-2 h-5 w-5 rounded-full border-2 border-white shadow-md z-10 transition-transform group-hover:scale-125"
                                                            style={{ backgroundColor: color.code }}
                                                            title={color.code}
                                                        />
                                                    </>
                                                ) : (
                                                    <div
                                                        className="w-full h-full transition-all duration-300"
                                                        style={{ backgroundColor: color.code }}
                                                    >
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="h-10 w-10 rounded-full border-4 border-white/40 animate-pulse" />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Edit overlay */}
                                                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="absolute bottom-2 right-2">
                                                        <Badge variant="secondary" className="text-xs font-mono opacity-90 backdrop-blur-sm">
                                                            <Edit className="h-3 w-3 mr-1" />
                                                            تعديل
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Color Info Footer */}
                                            <div className="p-3 bg-background/95 backdrop-blur-sm border-t border-border/50 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 rounded-full shrink-0 border border-border/50"
                                                        style={{ backgroundColor: color.code }}
                                                    />
                                                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{color.name}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-mono pr-5">{color.code}</p>
                                                {color.itemNumber && (
                                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.5">
                                                        {color.itemNumber}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Colors - Empty State */}
                        {(!product.colors || product.colors.length === 0) && (
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Palette className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold text-muted-foreground">الألوان المتاحة</h3>
                                    </div>
                                    <QuickAddColor
                                        productId={product.id}
                                        productName={product.name}
                                        productItemNumber={product.itemNumber}
                                        currentColors={null}
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 text-xs bg-linear-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 border-primary/30 text-primary hover:text-primary/90 transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5 ml-1" />
                                                إضافة لون
                                            </Button>
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground italic">لا توجد ألوان لهذا المنتج</p>
                            </div>
                        )}

                        {/* Section Divider */}
                        <div className="border-t border-border/20 my-6" />

                        {/* Price */}
                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-baseline gap-2 p-4 rounded-xl bg-linear-to-l from-primary/10 to-indigo-500/10 border border-primary/20">
                                <span className="text-sm text-muted-foreground">السعر:</span>
                                <span className="text-4xl font-black bg-linear-to-l from-primary via-primary to-indigo-400 bg-clip-text text-transparent">
                                    {formatPrice(product.price)}
                                </span>
                            </div>
                        </div>

                        {/* Product Details */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                            <div className="space-y-1 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                <p className="text-xs text-muted-foreground">الوحدة</p>
                                <p className="font-semibold">{product.unit}</p>
                            </div>
                            {product.tier && (
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <p className="text-xs text-muted-foreground">التصنيف</p>
                                    <p className="font-semibold">{product.tier}</p>
                                </div>
                            )}
                            {product.packaging && (
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors col-span-2">
                                    <p className="text-xs text-muted-foreground">التعبئة</p>
                                    <p className="font-semibold">{product.packaging}</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <ProductSheet
                                product={product as any}
                                trigger={
                                    <Button className="flex-1 gap-2 bg-linear-to-l from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80" size="lg">
                                        <Edit className="h-4 w-4" />
                                        تعديل
                                    </Button>
                                }
                            />

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                                        size="lg"
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                        حذف
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد من حذف هذا المنتج؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            سيؤدي هذا الإجراء إلى حذف المنتج "{product.name}" نهائياً من قاعدة البيانات وجميع الأشكال المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">عدد الأشكال</p>
                            <h3 className="text-3xl font-bold mt-2 group-hover:text-primary transition-colors">{product.variants.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Box className="size-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</p>
                            <h3 className="text-sm font-bold mt-2 group-hover:text-indigo-500 transition-colors">{formatDate(product.createdAt)}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar className="size-6 text-indigo-500" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">آخر تحديث</p>
                            <h3 className="text-sm font-bold mt-2 group-hover:text-green-500 transition-colors">{formatDate(product.updatedAt)}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-linear-to-br from-green-500/20 to-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar className="size-6 text-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Variants Section */}
            {product.variants.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-border/50">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Box className="h-6 w-6 text-primary" />
                            أشكال المنتج
                        </h2>
                        <QuickAddVariant
                            productId={product.id}
                            productName={product.name}
                            basePrice={Number(product.price)}
                            currentVariants={product.variants}
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {product.variants.map((variant) => (
                            <Dialog key={variant.id}>
                                <DialogTrigger asChild>
                                    <div className="group relative rounded-xl border border-border/50 bg-muted/20 overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                        {/* Variant Image */}
                                        <div className="aspect-square relative bg-muted/30">
                                            {variant.imagePath ? (
                                                <Image
                                                    src={variant.imagePath}
                                                    alt={variant.name}
                                                    fill
                                                    className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full bg-linear-to-br from-muted/50 to-muted/20">
                                                    <Package className="h-16 w-16 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                        {/* Variant Info */}
                                        <div className="p-4 space-y-2 bg-linear-to-t from-background/80 to-background/50 backdrop-blur-sm">
                                            <h3 className="font-semibold group-hover:text-primary transition-colors">{variant.name}</h3>
                                            {variant.price && (
                                                <p className="text-lg font-bold bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                                                    {formatPrice(variant.price)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-5xl border-none bg-black/95 p-0">
                                    <div className="relative aspect-square w-full">
                                        {variant.imagePath ? (
                                            <Image
                                                src={variant.imagePath}
                                                alt={variant.name}
                                                fill
                                                className="object-contain"
                                                priority
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Package className="h-32 w-32 text-white/30" />
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Color Dialog */}
            {selectedColor && (
                <EditColorDialog
                    productId={product.id}
                    productItemNumber={product.itemNumber}
                    productName={product.name}
                    color={selectedColor}
                    open={editColorOpen}
                    onOpenChange={setEditColorOpen}
                />
            )}
        </div>
    )
}
