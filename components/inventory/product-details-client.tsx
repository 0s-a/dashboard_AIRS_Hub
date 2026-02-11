"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
    ChevronRight,
    Package,
    Calendar,
    Edit,
    Trash2,
    Tag,
    Layers,
    Box,
    ArrowRight,
    Share2,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvailabilityToggle } from "@/components/inventory/availability-toggle"
import { ProductSheet } from "@/components/inventory/product-sheet"
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

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
                toast.success('تم حذف المنتج بنجاح')
                router.push('/inventory')
            } else {
                toast.error(result.error || 'فشل حذف المنتج')
                setIsDeleting(false)
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء الحذف')
            setIsDeleting(false)
        }
    }

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            toast.success('تم نسخ رابط المنتج')
        } catch (error) {
            toast.error('فشل نسخ الرابط')
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
                {/* Product Image with Lightbox */}
                <div className="glass-panel rounded-2xl p-6 border border-border/50">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="aspect-square relative rounded-xl overflow-hidden bg-muted/30 group cursor-pointer">
                                {product.imagePath ? (
                                    <Image
                                        src={product.imagePath}
                                        alt={product.name}
                                        fill
                                        className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/50 to-muted/20">
                                        <Package className="h-24 w-24 text-muted-foreground/30" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl border-none bg-black/95 p-0">
                            <div className="relative aspect-square w-full">
                                {product.imagePath ? (
                                    <Image
                                        src={product.imagePath}
                                        alt={product.name}
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
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    <div className="glass-panel rounded-2xl p-6 border border-border/50 space-y-4 hover:border-primary/20 transition-all duration-300">
                        {/* Title & Badge */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/80 bg-clip-text">
                                    {product.name}
                                </h1>
                                <AvailabilityToggle
                                    id={product.id}
                                    isAvailable={product.isAvailable}
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="gap-1.5 hover:bg-primary/5 transition-colors">
                                    <Tag className="h-3 w-3" />
                                    {product.itemNumber}
                                </Badge>
                                {product.category && (
                                    <Badge className="gap-1.5 bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all">
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

                        {/* Price */}
                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-baseline gap-2 p-4 rounded-xl bg-gradient-to-l from-primary/10 to-indigo-500/10 border border-primary/20">
                                <span className="text-sm text-muted-foreground">السعر:</span>
                                <span className="text-4xl font-black bg-gradient-to-l from-primary via-primary to-indigo-400 bg-clip-text text-transparent">
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
                                    <Button className="flex-1 gap-2 bg-gradient-to-l from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80" size="lg">
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
                        <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
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
                        <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
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
                        <div className="size-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar className="size-6 text-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Variants Section */}
            {product.variants.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-border/50">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Box className="h-6 w-6 text-primary" />
                        أشكال المنتج
                    </h2>
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
                                                <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/50 to-muted/20">
                                                    <Package className="h-16 w-16 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                        {/* Variant Info */}
                                        <div className="p-4 space-y-2 bg-gradient-to-t from-background/80 to-background/50 backdrop-blur-sm">
                                            <h3 className="font-semibold group-hover:text-primary transition-colors">{variant.name}</h3>
                                            {variant.price && (
                                                <p className="text-lg font-bold bg-gradient-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
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
        </div>
    )
}
