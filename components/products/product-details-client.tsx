"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
    ArrowRight,
    Edit,
    Loader2,
    Trash2,
    Coins,
    Scale,
    ImageIcon,
    Tag,
    Hash,
    Package,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { ProductSheet } from "@/components/inventory/product-sheet"
import { ProductPricingSheet } from "@/components/products/product-pricing-sheet"
import { deleteProduct, toggleProductAvailability } from "@/lib/actions/inventory"
import type { SerializedProduct } from "@/lib/actions/inventory"
import {
    formatItemTitle,
    INVENTORY_LABELS,
} from "@/lib/config/inventory-labels"

type ProductDetailsClientProps = {
    product: SerializedProduct
}

function AvailabilityBadge({ available }: { available: boolean }) {
    return (
        <Badge variant={available ? "default" : "secondary"}>
            {available ? "متوفر" : "غير متوفر"}
        </Badge>
    )
}

function ImageGallery({ images, name }: { images: SerializedProduct["mediaImages"]; name: string }) {
    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground border border-dashed rounded-xl">
                <ImageIcon className="h-10 w-10 opacity-40" />
                <p className="text-sm">لا توجد صور لهذا المنتج</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map(img => (
                <div
                    key={img.id}
                    className="relative aspect-square rounded-xl overflow-hidden border bg-muted/30"
                >
                    <Image
                        src={img.url}
                        alt={img.alt ?? name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {img.isPrimary && (
                        <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
                            رئيسية
                        </Badge>
                    )}
                </div>
            ))}
        </div>
    )
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [availabilityLoading, setAvailabilityLoading] = useState(false)
    const [available, setAvailable] = useState(product.isAvailable)

    const displayName = product.displayName || product.name
    const variantTitle = formatItemTitle(product.productAttributes)

    function handleRefresh() {
        router.refresh()
    }

    async function handleToggleAvailability(checked: boolean) {
        setAvailabilityLoading(true)
        const res = await toggleProductAvailability(product.id, checked)
        setAvailabilityLoading(false)
        if (res.success) {
            setAvailable(checked)
            toast.success(checked ? "تم تفعيل التوفر" : "تم إيقاف التوفر")
            handleRefresh()
        } else {
            toast.error(res.error || "فشل تحديث التوفر")
        }
    }

    async function handleDelete() {
        setIsDeleting(true)
        try {
            const res = await deleteProduct(product.id)
            if (res.success) {
                toast.success("تم حذف المنتج بنجاح")
                router.push("/products")
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
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Link href="/products" className="hover:text-primary flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    المنتجات
                </Link>
                <span className="text-border">/</span>
                <span className="text-foreground font-medium truncate">{product.name}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 bg-gradient-to-l from-primary/5 to-indigo-500/5 border border-primary/10 p-6 rounded-2xl shadow-sm">
                <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 text-white shadow-md shrink-0">
                            <Package className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{product.name}</h1>
                                {product.inheritsFamilyName && product.family && (
                                    <Badge variant="secondary" className="text-[10px]">
                                        موروث من الرئيسي
                                    </Badge>
                                )}
                                <AvailabilityBadge available={available} />
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {variantTitle !== '—' && (
                                    <span className="text-sm text-muted-foreground">{variantTitle}</span>
                                )}
                                <span className="text-xs font-mono text-muted-foreground" dir="ltr">
                                    · {product.itemNumber}
                                </span>
                            </div>
                        </div>
                    </div>

                    {product.family && (
                        <div className="text-sm">
                            <span className="text-muted-foreground">المنتج الرئيسي: </span>
                            <span className="font-medium">{product.family.name}</span>
                            <span className="font-mono text-xs text-muted-foreground mr-2" dir="ltr">
                                ({product.family.code})
                            </span>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">{product.brandRef.name}</Badge>
                        <Badge variant="outline">{product.category.name}</Badge>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href="/products">
                        <Button variant="outline" size="sm">العودة للقائمة</Button>
                    </Link>
                    <ProductSheet
                        product={product}
                        onSuccess={handleRefresh}
                        trigger={
                            <Button variant="outline" size="sm" className="gap-2">
                                <Edit className="h-4 w-4" />
                                تعديل
                            </Button>
                        }
                    />
                    <ProductPricingSheet
                        productId={product.id}
                        label={displayName}
                        initialPrices={product.productPrices}
                        productUnits={product.productUnits}
                        onUpdated={handleRefresh}
                        trigger={
                            <Button variant="outline" size="sm" className="gap-2">
                                <Coins className="h-4 w-4" />
                                التسعير
                            </Button>
                        }
                    />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-2"
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
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    سيؤدي هذا الإجراء إلى حذف المنتج &quot;{displayName}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
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

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Images */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                الصور
                            </CardTitle>
                            <CardDescription>
                                {product.mediaImages.length > 0
                                    ? `${product.mediaImages.length} صورة — عدّل الصور من نافذة التعديل`
                                    : "أضف صوراً من نافذة التعديل"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImageGallery images={product.mediaImages} name={displayName} />
                        </CardContent>
                    </Card>

                    {/* Description & metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Tag className="h-5 w-5 text-primary" />
                                البيانات
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {product.description ? (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">الوصف</p>
                                    <p className="text-sm whitespace-pre-wrap">{product.description}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">لا يوجد وصف</p>
                            )}

                            {product.tags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">التاغات</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {product.tags.map(tag => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.alternativeNames.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">أسماء بديلة</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {product.alternativeNames.map(name => (
                                            <Badge key={name} variant="outline">{name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Spec */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{INVENTORY_LABELS.attributes}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {product.productAttributes.length === 0 ? (
                                <p className="text-muted-foreground">لا توجد صفات</p>
                            ) : (
                                product.productAttributes.map(attr => (
                                    <div key={attr.id} className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">{attr.name}</span>
                                        <span className="font-medium font-mono" dir="ltr">{attr.value}</span>
                                    </div>
                                ))
                            )}
                            <div className="flex justify-between gap-4 items-center pt-2 border-t">
                                <span className="text-muted-foreground">التوفر</span>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={available}
                                        onCheckedChange={handleToggleAvailability}
                                        disabled={availabilityLoading}
                                    />
                                    <span className="text-xs">{available ? "متوفر" : "غير متوفر"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Units */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Scale className="h-5 w-5 text-primary" />
                                الوحدات
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {product.productUnits.length === 0 ? (
                                <p className="text-sm text-muted-foreground">لم تُعرّف وحدات بعد</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الوحدة</TableHead>
                                            <TableHead className="text-center">أساسية</TableHead>
                                            <TableHead className="text-left" dir="ltr">×</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {product.productUnits.map(pu => (
                                            <TableRow key={pu.id}>
                                                <TableCell className="font-medium">{pu.unitName}</TableCell>
                                                <TableCell className="text-center">
                                                    {pu.isBase ? "✓" : "—"}
                                                </TableCell>
                                                <TableCell className="text-left font-mono" dir="ltr">
                                                    {pu.conversionFactor}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Pricing */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Coins className="h-5 w-5 text-primary" />
                            التسعير
                        </CardTitle>
                        <CardDescription>
                            {product.productPrices.length > 0
                                ? `${product.productPrices.length} سعر مسجّل`
                                : "لا توجد أسعار — استخدم زر التسعير للإضافة"}
                        </CardDescription>
                    </div>
                    <ProductPricingSheet
                        productId={product.id}
                        label={displayName}
                        initialPrices={product.productPrices}
                        productUnits={product.productUnits}
                        onUpdated={handleRefresh}
                    />
                </CardHeader>
                <CardContent>
                    {product.productPrices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">لم تُضف أسعار بعد</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>مسمّى السعر</TableHead>
                                        <TableHead>الوحدة</TableHead>
                                        <TableHead className="text-left">القيمة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {product.productPrices.map(price => (
                                        <TableRow key={price.id}>
                                            <TableCell>{price.priceLabelName}</TableCell>
                                            <TableCell>{price.unitName}</TableCell>
                                            <TableCell className="text-left font-mono" dir="ltr">
                                                {price.value}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* System metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
                <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {INVENTORY_LABELS.itemNumber}: <span dir="ltr">{product.itemNumber}</span>
                </span>
                <span dir="ltr">slug: {product.slug}</span>
                <span>
                    أُنشئ:{" "}
                    {new Date(product.createdAt).toLocaleDateString("ar-YE", {
                        timeZone: "Asia/Aden",
                    })}
                </span>
                <span>
                    آخر تحديث:{" "}
                    {new Date(product.updatedAt).toLocaleDateString("ar-YE", {
                        timeZone: "Asia/Aden",
                    })}
                </span>
            </div>
        </div>
    )
}
