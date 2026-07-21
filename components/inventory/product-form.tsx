"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import React, { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    X,
    Plus,
    Hash,
    Package,
    Tags,
    Scale,
    ImageIcon,
    Tag,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { createProduct, updateProduct } from "@/lib/actions/inventory"
import { getBrands } from "@/lib/actions/brands"
import { getProductFamilies } from "@/lib/actions/product-families"
import { getUnits } from "@/lib/actions/units"
import { getProductAttributes } from "@/lib/actions/product-attributes"
import { getProductImages } from "@/lib/actions/product-images"
import type { ProductImageRecord } from "@/lib/actions/product-images"
import { UnitsPanel } from "@/components/inventory/pricing/units-panel"
import { PriceListPanel } from "@/components/inventory/pricing/price-list-panel"
import {
    ProductAttributesField,
    type AttributeDraft,
    type CatalogAttribute,
} from "@/components/inventory/product-attributes-field"
import { ImageGalleryUpload } from "@/components/ui/image-gallery-upload"
import { useProductPricing } from "@/hooks/use-product-pricing"
import type { SerializedProduct } from "@/lib/actions/inventory"
import type { ProductUnitEntry } from "@/lib/types/product"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"

const formSchema = z.object({
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    brandId: z.string().min(1, { message: "البراند مطلوب" }),
    itemNumber: z.string().trim().min(1, { message: "رقم الصنف مطلوب" }),
    description: z.string().optional().nullable(),
    tags: z.array(z.string().min(1, "التاغ لا يمكن أن يكون فارغاً")).optional(),
    familyId: z.string().min(1, { message: "المنتج الرئيسي مطلوب" }),
})

type FormValues = z.infer<typeof formSchema>

type BrandOption = { id: string; name: string; code: string }
type FamilyOption = {
    id: string
    name: string
    code: string
    categoryId: string
    categoryName: string
}

interface ProductFormProps {
    product?: SerializedProduct
    onSuccess?: () => void
}

function toAttributeDrafts(
    product?: SerializedProduct
): AttributeDraft[] {
    return (product?.productAttributes ?? []).map(a => ({
        key: a.id,
        attributeId: a.attributeId,
        value: a.value,
    }))
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [brands, setBrands] = useState<BrandOption[]>([])
    const [families, setFamilies] = useState<FamilyOption[]>([])
    const [attributeCatalog, setAttributeCatalog] = useState<CatalogAttribute[]>([])
    const [attributeDrafts, setAttributeDrafts] = useState<AttributeDraft[]>(() => toAttributeDrafts(product))
    const [sysUnits, setSysUnits] = useState<{ id: string; name: string; pluralName?: string | null }[]>([])
    const [productUnits, setProductUnits] = useState<ProductUnitEntry[]>(product?.productUnits ?? [])
    const [images, setImages] = useState<ProductImageRecord[]>([])
    const [isLoadingOptions, setIsLoadingOptions] = useState(true)

    const {
        prices,
        setPrices,
        priceLabels,
        currencies,
        isLoading: pricingLoading,
    } = useProductPricing({
        initialPrices: product?.productPrices ?? [],
        initialUnits: product?.productUnits ?? [],
    })

    useEffect(() => {
        async function loadOptions() {
            const [brandRes, familyRes, attrsRes, unitsRes] = await Promise.all([
                getBrands(),
                getProductFamilies(),
                getProductAttributes(),
                product ? getUnits() : Promise.resolve({ success: true, data: [] }),
            ])
            if (brandRes.success && brandRes.data) setBrands(brandRes.data as BrandOption[])
            if (familyRes.success && familyRes.data) {
                setFamilies(
                    familyRes.data.map((f: {
                        id: string
                        name: string
                        code: string
                        categoryId: string
                        category?: { name: string }
                    }) => ({
                        id: f.id,
                        name: f.name,
                        code: f.code,
                        categoryId: f.categoryId,
                        categoryName: f.category?.name ?? '',
                    }))
                )
            }
            if (attrsRes.success && attrsRes.data) {
                setAttributeCatalog(
                    attrsRes.data.map(a => ({
                        id: a.id,
                        code: a.code,
                        name: a.name,
                        examples: a.examples ?? [],
                    }))
                )
            }
            if (unitsRes.success && unitsRes.data) setSysUnits(unitsRes.data as typeof sysUnits)
            setIsLoadingOptions(false)
        }
        loadOptions()
    }, [product])

    useEffect(() => {
        if (!product?.id) return
        void getProductImages(product.id).then(res => {
            if (res.success) setImages(res.data)
        })
    }, [product?.id])

    useEffect(() => {
        if (product?.productUnits) setProductUnits(product.productUnits)
    }, [product])

    useEffect(() => {
        if (product?.productPrices) setPrices(product.productPrices)
    }, [product, setPrices])

    useEffect(() => {
        setAttributeDrafts(toAttributeDrafts(product))
    }, [product])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: product?.name ?? "",
            brandId: product?.brandId ?? "",
            itemNumber: product?.itemNumber ?? "",
            description: product?.description ?? "",
            tags: (product?.tags as string[]) ?? [],
            familyId: product?.familyId ?? "",
        },
    })

    const watchedFamilyId = form.watch("familyId")
    const selectedFamily = families.find(f => f.id === watchedFamilyId)

    async function onSubmit(values: FormValues) {
        const incomplete = attributeDrafts.some(d => d.attributeId && !d.value.trim())
        if (incomplete) {
            toast.error("أكمل قيم الصفات", { description: "كل صفة مضافة يجب أن تحتوي على قيمة" })
            return
        }

        const productAttributes = attributeDrafts
            .filter(d => d.attributeId && d.value.trim())
            .map(d => ({ attributeId: d.attributeId, value: d.value.trim() }))

        const selectedFamilyName = families.find(f => f.id === values.familyId)?.name
        const payload = {
            name: values.name.trim(),
            brandId: values.brandId.trim(),
            itemNumber: values.itemNumber.trim(),
            description: values.description?.trim() || null,
            tags: values.tags,
            productAttributes,
            familyId: values.familyId,
        }

        const toastName = values.name.trim()

        startTransition(async () => {
            try {
                if (product) {
                    const res = await updateProduct(product.id, payload)
                    if (res.success) {
                        toast.success("تم تحديث المنتج", {
                            description: `تم حفظ التغييرات على "${toastName}" بنجاح`,
                        })
                        onSuccess?.()
                        router.refresh()
                    } else {
                        toast.error("فشل الحفظ", { description: res.error || "تعذّر حفظ بيانات المنتج" })
                    }
                    return
                }

                const res = await createProduct(payload)
                if (!res.success || !res.data) {
                    toast.error("فشل الحفظ", { description: res.error || "تعذّر حفظ بيانات المنتج" })
                    return
                }

                toast.success("تم إنشاء المنتج", {
                    description: `تم إنشاء "${toastName}"${selectedFamilyName ? ` تحت «${selectedFamilyName}»` : ""} — يمكنك إضافة الصور والتسعير`,
                })
                onSuccess?.()
                router.push(`/products/${res.data.id}`)
            } catch {
                toast.error("خطأ غير متوقع", {
                    description: "تعذّر الاتصال بالخادم، يُرجى التحقق من الاتصال والمحاولة مجدداً",
                })
            }
        })
    }

    function onInvalid() {
        toast.error("راجع البيانات المدخلة", {
            description: "توجد حقول إجبارية لم تقم بتعبئتها أو تم تعبئتها بشكل خاطئ.",
        })
    }

    const refreshImages = () => {
        if (!product?.id) return
        void getProductImages(product.id).then(res => {
            if (res.success) setImages(res.data)
        })
        router.refresh()
    }

    const noFamilies = !isLoadingOptions && families.length === 0

    const basicFields = (
        <div className="space-y-5">
            {noFamilies ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">لا يوجد منتجات رئيسية</p>
                    <p className="text-xs text-muted-foreground">
                        يجب إنشاء منتج رئيسي أولاً قبل إضافة أصناف — التصنيف يُربَط عبر المنتج الرئيسي.
                    </p>
                    <Link
                        href="/product-families"
                        className="inline-flex text-xs font-semibold text-primary hover:underline"
                    >
                        الذهاب إلى المنتجات الرئيسية
                    </Link>
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="familyId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>المنتج الرئيسي <span className="text-destructive">*</span></FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                            disabled={noFamilies}
                        >
                            <FormControl>
                                <SelectTrigger className="w-full focus:ring-primary/20">
                                    <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : noFamilies ? "لا توجد منتجات رئيسية" : "اختر المنتج الرئيسي"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {families.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.name}
                                        <span className="text-muted-foreground font-mono text-xs mr-2" dir="ltr">
                                            ({f.code})
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">إلزامي — التصنيف يُؤخذ من المنتج الرئيسي</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {selectedFamily ? (
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-1">
                    <p className="text-xs text-muted-foreground">تصنيف المنتج الرئيسي</p>
                    <p className="text-sm font-medium">{selectedFamily.categoryName || "—"}</p>
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            اسم المنتج <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="مثال: آيفون 15..."
                                className="focus-visible:ring-primary/20"
                                {...field}
                            />
                        </FormControl>
                        <FormDescription className="text-xs">
                            اسم هذا الصنف — مستقل عن اسم المنتج الرئيسي
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>البراند <span className="text-destructive">*</span></FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                        >
                            <FormControl>
                                <SelectTrigger className="w-full focus:ring-primary/20">
                                    <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر البراند"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {brands.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="itemNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{INVENTORY_LABELS.itemNumber} <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                            <Input
                                placeholder="مثال: TEST-001"
                                className="font-mono text-sm"
                                dir="ltr"
                                {...field}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormDescription className="text-xs">إلزامي وفريد — لا يمكن تكراره بين المنتجات</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <ProductAttributesField
                catalog={attributeCatalog}
                value={attributeDrafts}
                onChange={setAttributeDrafts}
                disabled={isLoadingOptions}
            />

            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="وصف تفصيلي للمنتج..."
                                className="min-h-[80px]"
                                {...field}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <TagsField control={form.control} />
        </div>
    )

    const submitBar = (
        <div className={product ? "fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]" : "flex gap-3 pt-2"}>
            <div className={product ? "container max-w-5xl mx-auto flex items-center justify-between" : "flex gap-3 w-full"}>
                {product && (
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium">تحديث بيانات المنتج</p>
                        <p className="text-xs text-muted-foreground">تأكد من صحة البيانات قبل الحفظ</p>
                    </div>
                )}
                <div className={`flex items-center gap-3 ${product ? "w-full sm:w-auto" : "w-full"}`}>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className={product ? "flex-1 sm:flex-none border-dashed" : "flex-1"}
                    >
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending || noFamilies}
                        className={product ? "flex-1 sm:flex-none bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md" : "flex-1"}
                    >
                        {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        {product ? "حفظ التعديلات" : "إضافة المنتج"}
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit as any, onInvalid)}
                className={product ? "space-y-6 pb-24 relative" : "space-y-4"}
            >
                {product ? (
                    <Tabs defaultValue="data" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 mb-4">
                            <TabsTrigger value="data" className="gap-2">
                                <Package className="h-4 w-4" />
                                البيانات
                            </TabsTrigger>
                            <TabsTrigger value="images" className="gap-2">
                                <ImageIcon className="h-4 w-4" />
                                الصور
                            </TabsTrigger>
                            <TabsTrigger value="units" className="gap-2">
                                <Scale className="h-4 w-4" />
                                الوحدات
                            </TabsTrigger>
                            <TabsTrigger value="pricing" className="gap-2">
                                <Tag className="h-4 w-4" />
                                التسعير
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="data" className="space-y-6 mt-0">
                            <Card className="border-border/50 shadow-sm">
                                <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-primary" />
                                        <CardTitle className="text-lg">البيانات الأساسية</CardTitle>
                                    </div>
                                    <CardDescription>اسم المنتج، البراند، والمنتج الرئيسي</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">{basicFields}</CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="images" className="mt-0">
                            <Card className="border-border/50 shadow-sm">
                                <CardContent className="pt-6">
                                    <ImageGalleryUpload
                                        images={images}
                                        productId={product.id}
                                        productItemNumber={product.itemNumber}
                                        onImagesChange={refreshImages}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="units" className="mt-0">
                            <UnitsPanel
                                productId={product.id}
                                productUnits={productUnits}
                                sysUnits={sysUnits}
                                onUnitsChange={setProductUnits}
                            />
                        </TabsContent>

                        <TabsContent value="pricing" className="mt-0">
                            {pricingLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <PriceListPanel
                                    productId={product.id}
                                    prices={prices}
                                    productUnits={productUnits}
                                    priceLabels={priceLabels}
                                    currencies={currencies}
                                    onPricesChange={setPrices}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <>
                        {basicFields}
                        {submitBar}
                    </>
                )}

                {product && submitBar}
            </form>
        </Form>
    )
}

function TagsField({ control }: { control: ReturnType<typeof useForm<FormValues>>["control"] }) {
    const [tagInput, setTagInput] = useState("")

    return (
        <div className="space-y-4 pt-4 border-t">
            <FormLabel className="text-base font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4 text-violet-500" />
                الوسوم
            </FormLabel>

            <FormField
                control={control}
                name="tags"
                render={({ field }) => {
                    const tags = (field.value as string[]) || []

                    const addTag = (value: string) => {
                        const trimmed = value.trim()
                        if (trimmed && !tags.includes(trimmed)) {
                            field.onChange([...tags, trimmed])
                        }
                        setTagInput("")
                    }

                    const removeTag = (index: number) => {
                        field.onChange(tags.filter((_: string, i: number) => i !== index))
                    }

                    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                            e.preventDefault()
                            addTag(tagInput)
                        }
                        if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                            removeTag(tags.length - 1)
                        }
                    }

                    return (
                        <FormItem>
                            <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="اكتب الوسم واضغط Enter..."
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="h-9 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addTag(tagInput)}
                                        disabled={!tagInput.trim()}
                                        className="h-9 px-3"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        إضافة
                                    </Button>
                                </div>

                                {tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag: string, index: number) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="px-3 py-1.5 text-sm gap-1.5"
                                            >
                                                <Tags className="h-3 w-3 text-muted-foreground" />
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(index)}
                                                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-3 text-muted-foreground text-sm">
                                        لا توجد وسوم مضافة
                                    </p>
                                )}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )
                }}
            />
        </div>
    )
}
