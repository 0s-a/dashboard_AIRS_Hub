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
    Plus,
    FileText,
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
import { ItemSheet } from "@/components/items/item-sheet"
import { ItemPricingSheet } from "@/components/items/item-pricing-sheet"
import { QuickAddAlternativeName } from "@/components/items/quick-add-alternative-name"
import { deleteItem, toggleItemAvailability } from "@/lib/actions/items"
import type { SerializedItem } from "@/lib/types/item"
import {
    formatItemTitle,
    INVENTORY_LABELS,
} from "@/lib/config/inventory-labels"

type ItemDetailsClientProps = {
    item: SerializedItem
}

function AvailabilityBadge({ available }: { available: boolean }) {
    return (
        <Badge variant={available ? "default" : "secondary"}>
            {available ? "متوفر" : "غير متوفر"}
        </Badge>
    )
}

function ImageGallery({ images, name }: { images: SerializedItem["mediaImages"]; name: string }) {
    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground border border-dashed rounded-xl">
                <ImageIcon className="h-10 w-10 opacity-40" />
                <p className="text-sm">لا توجد صور لهذا الصنف</p>
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

export function ItemDetailsClient({ item }: ItemDetailsClientProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [availabilityLoading, setAvailabilityLoading] = useState(false)
    const [available, setAvailable] = useState(item.isAvailable)

    const displayName = item.displayName || item.name
    const variantTitle = formatItemTitle(item.itemAttributes)

    function handleRefresh() {
        router.refresh()
    }

    async function handleToggleAvailability(checked: boolean) {
        setAvailabilityLoading(true)
        const res = await toggleItemAvailability(item.id, checked)
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
            const res = await deleteItem(item.id)
            if (res.success) {
                toast.success("تم حذف الصنف بنجاح")
                router.push("/items")
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
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Link href="/items" className="hover:text-primary flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    الأصناف
                </Link>
                <span className="text-border">/</span>
                <span className="text-foreground font-medium truncate">{item.name}</span>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 bg-gradient-to-l from-primary/5 to-indigo-500/5 border border-primary/10 p-6 rounded-2xl shadow-sm">
                <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 text-white shadow-md shrink-0">
                            <Package className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{item.name}</h1>
                                <AvailabilityBadge available={available} />
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {variantTitle !== '—' && (
                                    <span className="text-sm text-muted-foreground">{variantTitle}</span>
                                )}
                                <span className="text-xs font-mono text-muted-foreground" dir="ltr">
                                    · {item.itemNumber}
                                </span>
                            </div>
                        </div>
                    </div>

                    {item.product && (
                        <div className="text-sm">
                            <span className="text-muted-foreground">المنتج: </span>
                            <span className="font-medium">{item.product.name}</span>
                            <span className="font-mono text-xs text-muted-foreground mr-2" dir="ltr">
                                ({item.product.code})
                            </span>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">{item.brandRef.name}</Badge>
                        <Badge variant="outline">{item.category.name}</Badge>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href="/items">
                        <Button variant="outline" size="sm">العودة للقائمة</Button>
                    </Link>
                    <ItemSheet
                        item={item}
                        onSuccess={handleRefresh}
                        trigger={
                            <Button variant="outline" size="sm" className="gap-2">
                                <Edit className="h-4 w-4" />
                                تعديل
                            </Button>
                        }
                    />
                    <ItemPricingSheet
                        itemId={item.id}
                        label={displayName}
                        initialPrices={item.itemPrices}
                        itemUnits={item.itemUnits}
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
                                    سيؤدي هذا الإجراء إلى حذف الصنف &quot;{displayName}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                الصور
                            </CardTitle>
                            <CardDescription>
                                {item.mediaImages.length > 0
                                    ? `${item.mediaImages.length} صورة — عدّل الصور من نافذة التعديل`
                                    : "أضف صوراً من نافذة التعديل"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImageGallery images={item.mediaImages} name={displayName} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Tag className="h-5 w-5 text-primary" />
                                البيانات
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {item.description ? (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">الوصف</p>
                                    <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">لا يوجد وصف</p>
                            )}

                            {item.tags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">التاغات</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.tags.map(tag => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <p className="text-xs font-medium text-muted-foreground">أسماء بديلة</p>
                                    </div>
                                    <QuickAddAlternativeName
                                        itemId={item.id}
                                        itemName={item.name}
                                        currentAlternativeNames={item.alternativeNames}
                                        onSuccess={handleRefresh}
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
                                {item.alternativeNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.alternativeNames.map(name => (
                                            <Badge
                                                key={name}
                                                variant="outline"
                                                className="px-3 py-1.5 text-sm bg-linear-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200"
                                            >
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">لا توجد أسماء بديلة لهذا الصنف</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{INVENTORY_LABELS.attributes}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {item.itemAttributes.length === 0 ? (
                                <p className="text-muted-foreground">لا توجد صفات</p>
                            ) : (
                                item.itemAttributes.map(attr => (
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

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Scale className="h-5 w-5 text-primary" />
                                الوحدات
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {item.itemUnits.length === 0 ? (
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
                                        {item.itemUnits.map(iu => (
                                            <TableRow key={iu.id}>
                                                <TableCell className="font-medium">{iu.unitName}</TableCell>
                                                <TableCell className="text-center">
                                                    {iu.isBase ? "✓" : "—"}
                                                </TableCell>
                                                <TableCell className="text-left font-mono" dir="ltr">
                                                    {iu.conversionFactor}
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Coins className="h-5 w-5 text-primary" />
                            التسعير
                        </CardTitle>
                        <CardDescription>
                            {item.itemPrices.length > 0
                                ? `${item.itemPrices.length} سعر مسجّل`
                                : "لا توجد أسعار — استخدم زر التسعير للإضافة"}
                        </CardDescription>
                    </div>
                    <ItemPricingSheet
                        itemId={item.id}
                        label={displayName}
                        initialPrices={item.itemPrices}
                        itemUnits={item.itemUnits}
                        onUpdated={handleRefresh}
                    />
                </CardHeader>
                <CardContent>
                    {item.itemPrices.length === 0 ? (
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
                                    {item.itemPrices.map(price => (
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

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
                <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {INVENTORY_LABELS.itemNumber}: <span dir="ltr">{item.itemNumber}</span>
                </span>
                <span dir="ltr">slug: {item.slug}</span>
                <span>
                    أُنشئ:{" "}
                    {new Date(item.createdAt).toLocaleDateString("ar-YE", {
                        timeZone: "Asia/Aden",
                    })}
                </span>
                <span>
                    آخر تحديث:{" "}
                    {new Date(item.updatedAt).toLocaleDateString("ar-YE", {
                        timeZone: "Asia/Aden",
                    })}
                </span>
            </div>
        </div>
    )
}
