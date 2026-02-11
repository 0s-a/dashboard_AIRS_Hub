import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Package, Calendar, Edit, Trash2, Tag, Layers, Box } from "lucide-react"
import { getProductById } from "@/lib/actions/inventory"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvailabilityToggle } from "@/components/inventory/availability-toggle"

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getProductById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    const product = result.data
    const formatPrice = (price: any) => {
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

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/inventory" className="hover:text-primary transition-colors">المخزون</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">{product.name}</span>
            </nav>

            {/* Hero Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Product Image */}
                <div className="glass-panel rounded-2xl p-6 border border-border/50">
                    <div className="aspect-square relative rounded-xl overflow-hidden bg-muted/30 group">
                        {product.imagePath ? (
                            <Image
                                src={product.imagePath}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Package className="h-24 w-24 text-muted-foreground/30" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    <div className="glass-panel rounded-2xl p-6 border border-border/50 space-y-4">
                        {/* Title & Badge */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
                                <AvailabilityToggle
                                    id={product.id}
                                    isAvailable={product.isAvailable}
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="gap-1.5">
                                    <Tag className="h-3 w-3" />
                                    {product.itemNumber}
                                </Badge>
                                {product.category && (
                                    <Badge className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20">
                                        <Layers className="h-3 w-3" />
                                        {product.category.name}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Brand */}
                        {product.brand && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">العلامة التجارية:</span>
                                <span className="font-medium">{product.brand}</span>
                            </div>
                        )}

                        {/* Description */}
                        {product.description && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground">الوصف</h3>
                                <p className="text-sm leading-relaxed">{product.description}</p>
                            </div>
                        )}

                        {/* Price */}
                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm text-muted-foreground">السعر:</span>
                                <span className="text-3xl font-bold bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                                    {formatPrice(product.price)}
                                </span>
                            </div>
                        </div>

                        {/* Product Details */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">الوحدة</p>
                                <p className="font-medium">{product.unit}</p>
                            </div>
                            {product.tier && (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">التصنيف</p>
                                    <p className="font-medium">{product.tier}</p>
                                </div>
                            )}
                            {product.packaging && (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">التعبئة</p>
                                    <p className="font-medium">{product.packaging}</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button className="flex-1 gap-2" size="lg">
                                <Edit className="h-4 w-4" />
                                تعديل
                            </Button>
                            <Button variant="outline" className="gap-2" size="lg">
                                <Trash2 className="h-4 w-4" />
                                حذف
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">عدد الأشكال</p>
                            <h3 className="text-3xl font-bold mt-2">{product.variants.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Box className="size-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</p>
                            <h3 className="text-sm font-bold mt-2">{formatDate(product.createdAt)}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <Calendar className="size-6 text-indigo-500" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">آخر تحديث</p>
                            <h3 className="text-sm font-bold mt-2">{formatDate(product.updatedAt)}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
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
                            <div
                                key={variant.id}
                                className="group relative rounded-xl border border-border/50 bg-muted/20 overflow-hidden hover:border-primary/50 transition-all duration-300"
                            >
                                {/* Variant Image */}
                                <div className="aspect-square relative bg-muted/30">
                                    {variant.imagePath ? (
                                        <Image
                                            src={variant.imagePath}
                                            alt={variant.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Package className="h-16 w-16 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                                {/* Variant Info */}
                                <div className="p-4 space-y-2">
                                    <h3 className="font-semibold">{variant.name}</h3>
                                    {variant.price && (
                                        <p className="text-lg font-bold text-primary">
                                            {formatPrice(variant.price)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
