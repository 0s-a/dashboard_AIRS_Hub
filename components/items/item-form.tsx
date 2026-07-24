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

import { createItem, updateItem } from "@/lib/actions/items"
import { getProducts } from "@/lib/actions/products"
import { getUnits } from "@/lib/actions/units"
import { getItemAttributes } from "@/lib/actions/item-attributes"
import { getItemImages } from "@/lib/actions/item-images"
import type { ItemImageRecord } from "@/lib/actions/item-images"
import { UnitsPanel } from "@/components/items/pricing/units-panel"
import { PriceListPanel } from "@/components/items/pricing/price-list-panel"
import {
    ItemAttributesField,
    type AttributeDraft,
    type CatalogAttribute,
} from "@/components/items/item-attributes-field"
import { ImageGalleryUpload } from "@/components/ui/image-gallery-upload"
import { useItemPricing } from "@/hooks/use-item-pricing"
import type { SerializedItem, ItemUnitEntry } from "@/lib/types/item"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"

const formSchema = z.object({
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    itemNumber: z.string().trim().min(1, { message: "رقم الصنف مطلوب" }),
    description: z.string().optional().nullable(),
    alternativeNames: z.array(z.string().min(1, "الاسم البديل لا يمكن أن يكون فارغاً")).optional(),
    tags: z.array(z.string().min(1, "التاغ لا يمكن أن يكون فارغاً")).optional(),
    productId: z.string().min(1, { message: "المنتج مطلوب" }),
})

type FormValues = z.infer<typeof formSchema>

type ProductOption = {
    id: string
    name: string
    code: string
    brandName: string
    categoryName: string
}

interface ItemFormProps {
    item?: SerializedItem
    onSuccess?: () => void
}

function toAttributeDrafts(item?: SerializedItem): AttributeDraft[] {
    return (item?.itemAttributes ?? []).map(a => ({
        key: a.id,
        attributeId: a.attributeId,
        value: a.value,
    }))
}

export function ItemForm({ item, onSuccess }: ItemFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [products, setProducts] = useState<ProductOption[]>([])
    const [attributeCatalog, setAttributeCatalog] = useState<CatalogAttribute[]>([])
    const [attributeDrafts, setAttributeDrafts] = useState<AttributeDraft[]>(() => toAttributeDrafts(item))
    const [sysUnits, setSysUnits] = useState<{ id: string; name: string; pluralName?: string | null }[]>([])
    const [itemUnits, setItemUnits] = useState<ItemUnitEntry[]>(item?.itemUnits ?? [])
    const [images, setImages] = useState<ItemImageRecord[]>([])
    const [isLoadingOptions, setIsLoadingOptions] = useState(true)

    const {
        prices,
        setPrices,
        priceLabels,
        currencies,
        isLoading: pricingLoading,
    } = useItemPricing({
        initialPrices: item?.itemPrices ?? [],
        initialUnits: item?.itemUnits ?? [],
    })

    useEffect(() => {
        async function loadOptions() {
            const [productsRes, attrsRes, unitsRes] = await Promise.all([
                getProducts(),
                getItemAttributes(),
                item ? getUnits() : Promise.resolve({ success: true, data: [] }),
            ])
            if (productsRes.success && productsRes.data) {
                setProducts(
                    productsRes.data.map((p: {
                        id: string
                        name: string
                        code: string
                        brand?: { name: string }
                        category?: { name: string }
                    }) => ({
                        id: p.id,
                        name: p.name,
                        code: p.code,
                        brandName: p.brand?.name ?? "",
                        categoryName: p.category?.name ?? "",
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
    }, [item])

    useEffect(() => {
        if (!item?.id) return
        void getItemImages(item.id).then(res => {
            if (res.success) setImages(res.data)
        })
    }, [item?.id])

    useEffect(() => {
        if (item?.itemUnits) setItemUnits(item.itemUnits)
    }, [item])

    useEffect(() => {
        if (item?.itemPrices) setPrices(item.itemPrices)
    }, [item, setPrices])

    useEffect(() => {
        setAttributeDrafts(toAttributeDrafts(item))
    }, [item])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: item?.name ?? "",
            itemNumber: item?.itemNumber ?? "",
            description: item?.description ?? "",
            alternativeNames: (item?.alternativeNames as string[]) ?? [],
            tags: (item?.tags as string[]) ?? [],
            productId: item?.productId ?? "",
        },
    })

    const watchedProductId = form.watch("productId")
    const selectedProduct = products.find(p => p.id === watchedProductId)

    async function onSubmit(values: FormValues) {
        const incomplete = attributeDrafts.some(d => d.attributeId && !d.value.trim())
        if (incomplete) {
            toast.error("أكمل قيم الصفات", { description: "كل صفة مضافة يجب أن تحتوي على قيمة" })
            return
        }

        const itemAttributes = attributeDrafts
            .filter(d => d.attributeId && d.value.trim())
            .map(d => ({ attributeId: d.attributeId, value: d.value.trim() }))

        const selectedProductName = products.find(p => p.id === values.productId)?.name
        const payload = {
            name: values.name.trim(),
            itemNumber: values.itemNumber.trim(),
            description: values.description?.trim() || null,
            alternativeNames: values.alternativeNames,
            tags: values.tags,
            itemAttributes,
            productId: values.productId,
        }

        const toastName = values.name.trim()

        startTransition(async () => {
            try {
                if (item) {
                    const res = await updateItem(item.id, payload)
                    if (res.success) {
                        toast.success("تم تحديث الصنف", {
                            description: `تم حفظ التغييرات على "${toastName}" بنجاح`,
                        })
                        onSuccess?.()
                        router.refresh()
                    } else {
                        toast.error("فشل الحفظ", { description: res.error || "تعذّر حفظ بيانات الصنف" })
                    }
                    return
                }

                const res = await createItem(payload)
                if (!res.success || !res.data) {
                    toast.error("فشل الحفظ", { description: res.error || "تعذّر حفظ بيانات الصنف" })
                    return
                }

                toast.success("تم إنشاء الصنف", {
                    description: `تم إنشاء "${toastName}"${selectedProductName ? ` تحت «${selectedProductName}»` : ""} — يمكنك إضافة الصور والتسعير`,
                })
                onSuccess?.()
                router.push(`/items/${res.data.id}`)
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
        if (!item?.id) return
        void getItemImages(item.id).then(res => {
            if (res.success) setImages(res.data)
        })
        router.refresh()
    }

    const noProducts = !isLoadingOptions && products.length === 0

    const basicFields = (
        <div className="space-y-5">
            {noProducts ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">لا يوجد منتجات</p>
                    <p className="text-xs text-muted-foreground">
                        يجب إنشاء منتج أولاً قبل إضافة أصناف — البراند والتصنيف يُربطان عبر المنتج.
                    </p>
                    <Link
                        href="/products"
                        className="inline-flex text-xs font-semibold text-primary hover:underline"
                    >
                        الذهاب إلى الأصناف
                    </Link>
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>المنتج <span className="text-destructive">*</span></FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                            disabled={noProducts}
                        >
                            <FormControl>
                                <SelectTrigger className="w-full focus:ring-primary/20">
                                    <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : noProducts ? "لا توجد منتجات" : "اختر المنتج"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                        <span className="text-muted-foreground font-mono text-xs mr-2" dir="ltr">
                                            ({p.code})
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">إلزامي — البراند والتصنيف يُؤخذان من المنتج</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {selectedProduct ? (
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">البراند</p>
                        <p className="text-sm font-medium">{selectedProduct.brandName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">التصنيف</p>
                        <p className="text-sm font-medium">{selectedProduct.categoryName || "—"}</p>
                    </div>
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            اسم الصنف <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="مثال: آيفون 15..."
                                className="focus-visible:ring-primary/20"
                                {...field}
                            />
                        </FormControl>
                        <FormDescription className="text-xs">
                            اسم هذا الصنف — مستقل عن اسم المنتج
                        </FormDescription>
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
                        <FormDescription className="text-xs">إلزامي وفريد — لا يمكن تكراره بين الأصناف</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <ItemAttributesField
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
                                placeholder="وصف تفصيلي للصنف..."
                                className="min-h-[80px]"
                                {...field}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <AlternativeNamesField control={form.control} />
            <TagsField control={form.control} />
        </div>
    )

    const submitBar = (
        <div className={item ? "fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]" : "flex gap-3 pt-2"}>
            <div className={item ? "container max-w-5xl mx-auto flex items-center justify-between" : "flex gap-3 w-full"}>
                {item && (
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium">تحديث بيانات الصنف</p>
                        <p className="text-xs text-muted-foreground">تأكد من صحة البيانات قبل الحفظ</p>
                    </div>
                )}
                <div className={`flex items-center gap-3 ${item ? "w-full sm:w-auto" : "w-full"}`}>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className={item ? "flex-1 sm:flex-none border-dashed" : "flex-1"}
                    >
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending || noProducts}
                        className={item ? "flex-1 sm:flex-none bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md" : "flex-1"}
                    >
                        {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        {item ? "حفظ التعديلات" : "إضافة الصنف"}
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit as any, onInvalid)}
                className={item ? "space-y-6 pb-24 relative" : "space-y-4"}
            >
                {item ? (
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
                                    <CardDescription>اسم الصنف والمنتج المرتبط</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">{basicFields}</CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="images" className="mt-0">
                            <Card className="border-border/50 shadow-sm">
                                <CardContent className="pt-6">
                                    <ImageGalleryUpload
                                        images={images}
                                        itemId={item.id}
                                        itemNumber={item.itemNumber}
                                        onImagesChange={refreshImages}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="units" className="mt-0">
                            <UnitsPanel
                                itemId={item.id}
                                itemUnits={itemUnits}
                                sysUnits={sysUnits}
                                onUnitsChange={setItemUnits}
                            />
                        </TabsContent>

                        <TabsContent value="pricing" className="mt-0">
                            {pricingLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <PriceListPanel
                                    itemId={item.id}
                                    prices={prices}
                                    itemUnits={itemUnits}
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

                {item && submitBar}
            </form>
        </Form>
    )
}

function AlternativeNamesField({ control }: { control: ReturnType<typeof useForm<FormValues>>["control"] }) {
    const [nameInput, setNameInput] = useState("")

    return (
        <div className="space-y-4 pt-4 border-t">
            <FormLabel className="text-base font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-500" />
                الأسماء البديلة
            </FormLabel>
            <FormDescription>
                أسماء شائعة يستخدمها الزبائن للبحث عن هذا الصنف
            </FormDescription>

            <FormField
                control={control}
                name="alternativeNames"
                render={({ field }) => {
                    const names = (field.value as string[]) || []

                    const addName = (value: string) => {
                        const trimmed = value.trim()
                        if (trimmed && !names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
                            field.onChange([...names, trimmed])
                        }
                        setNameInput("")
                    }

                    const removeName = (index: number) => {
                        field.onChange(names.filter((_: string, i: number) => i !== index))
                    }

                    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                            e.preventDefault()
                            addName(nameInput)
                        }
                        if (e.key === "Backspace" && !nameInput && names.length > 0) {
                            removeName(names.length - 1)
                        }
                    }

                    return (
                        <FormItem>
                            <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="اكتب الاسم البديل واضغط Enter..."
                                        value={nameInput}
                                        onChange={e => setNameInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="h-9 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addName(nameInput)}
                                        disabled={!nameInput.trim()}
                                        className="h-9 px-3"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        إضافة
                                    </Button>
                                </div>

                                {names.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {names.map((name: string, index: number) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="px-3 py-1.5 text-sm gap-1.5 bg-amber-50 text-amber-800 border-amber-200"
                                            >
                                                {name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeName(index)}
                                                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-3 text-muted-foreground text-sm">
                                        لا توجد أسماء بديلة مضافة
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
