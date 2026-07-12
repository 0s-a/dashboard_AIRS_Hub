"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import React, { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Trash2, Plus, Hash, Package, FileText, Settings, Tags, Scale, Palette, ChevronDown } from "lucide-react"
import { toast } from "sonner"

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
import { addSKCsBatch } from "@/lib/actions/skc"
import { getCategories } from "@/lib/actions/categories"
import { getBrands } from "@/lib/actions/brands"
import { getUnits } from "@/lib/actions/units"
import { UnitsPanel } from "@/components/inventory/pricing/units-panel"
import { ColorChipPicker } from "@/components/inventory/color-chip-picker"
import type { SerializedProduct } from "@/lib/actions/inventory"
import type { ProductUnitEntry } from "@/lib/types/product"
import { SKU_SPEC_CONFIGS, DEFAULT_SKU_SPEC_KIND } from "@/lib/config/sku-spec.config"
import type { SkuSpecKind } from "@/lib/config/sku-spec.config"

// ─── Schema ──────────────────────────────────────────────────

const formSchema = z.object({
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    productNumber: z.string()
        .length(3, { message: "رقم المنتج: 3 خانات بالضبط" })
        .regex(/^[A-Za-z0-9]{3}$/, { message: "3 أحرف أو أرقام إنجليزية فقط" })
        .transform(v => v.toUpperCase()),
    slug: z.string().optional().nullable(),
    brandId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    alternativeNames: z.array(z.string().min(1, "الاسم البديل لا يمكن أن يكون فارغاً")).optional(),
    tags: z.array(z.string().min(1, "التاغ لا يمكن أن يكون فارغاً")).optional(),
    colorIds: z.array(z.string()).optional().default([]),
    skuSpecKind: z.enum(['size', 'packaging', 'length', 'free']).optional().default('free'),
})

type FormValues = z.infer<typeof formSchema>

// ─── Option types ────────────────────────────────────────────

type CategoryOption = { id: string; name: string; code: string; icon: string | null; parentId?: string | null }
type BrandOption = { id: string; name: string; code: string }

function flattenCategoryTree(
    categories: CategoryOption[],
    parentId: string | null = null,
    depth = 0
): { id: string; label: string }[] {
    return categories
        .filter(c => (c.parentId ?? null) === parentId)
        .flatMap(c => [
            { id: c.id, label: `${"—".repeat(depth)}${depth > 0 ? " " : ""}${c.name}` },
            ...flattenCategoryTree(categories, c.id, depth + 1),
        ])
}

// ─── Props ───────────────────────────────────────────────────

interface ProductFormProps {
    product?: SerializedProduct
    onSuccess?: () => void
}

// ─── Component ───────────────────────────────────────────────

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [brands, setBrands] = useState<BrandOption[]>([])
    const [sysUnits, setSysUnits] = useState<{ id: string; name: string; pluralName?: string | null }[]>([])
    const [productUnits, setProductUnits] = useState<ProductUnitEntry[]>(product?.productUnits ?? [])
    const [isLoadingOptions, setIsLoadingOptions] = useState(true)

    // Load dropdown options on mount
    useEffect(() => {
        async function loadOptions() {
            const [catRes, brandRes, unitsRes] = await Promise.all([
                getCategories(),
                getBrands(),
                product ? getUnits() : Promise.resolve({ success: true, data: [] }),
            ])
            if (catRes.success && catRes.data) setCategories(catRes.data as CategoryOption[])
            if (brandRes.success && brandRes.data) setBrands(brandRes.data as BrandOption[])
            if (unitsRes.success && unitsRes.data) setSysUnits(unitsRes.data as typeof sysUnits)
            setIsLoadingOptions(false)
        }
        loadOptions()
    }, [product])

    useEffect(() => {
        if (product?.productUnits) setProductUnits(product.productUnits)
    }, [product])

    // ── Form setup ───────────────────────────────────────────

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name:             product?.name ?? "",
            productNumber:    product?.productNumber ?? "",
            slug:             product?.slug ?? "",
            brandId:          product?.brandId ?? null,
            description:      product?.description ?? "",
            categoryId:       product?.categoryId ?? "",
            alternativeNames: (product?.alternativeNames as string[]) ?? [],
            tags:             (product?.tags as string[]) ?? [],
            colorIds:         [],
            skuSpecKind:      (product?.skuSpecKind as SkuSpecKind) ?? DEFAULT_SKU_SPEC_KIND,
        },
    })

    const watchedProductNumber = form.watch("productNumber")

    const {
        fields: alternativeNameFields,
        append: appendAlternativeName,
        remove: removeAlternativeName,
    } = useFieldArray({
        control: form.control as any,
        name: "alternativeNames",
    })

    // ── Submit handler ───────────────────────────────────────

    async function onSubmit(values: FormValues) {
        const { colorIds, ...rest } = values
        const payload = {
            ...rest,
            slug: rest.slug?.trim() || undefined,
        }

        startTransition(async () => {
            try {
                if (product) {
                    const res = await updateProduct(product.id, payload)
                    if (res.success) {
                        toast.success('تم تحديث المنتج', {
                            description: `تم حفظ التغييرات على المنتج "${values.name}" بنجاح`,
                        })
                        onSuccess?.()
                        router.refresh()
                    } else {
                        toast.error('فشل الحفظ', { description: res.error || 'تعذّر حفظ بيانات المنتج' })
                    }
                    return
                }

                const res = await createProduct(payload)
                if (!res.success || !res.data) {
                    toast.error('فشل الحفظ', { description: res.error || 'تعذّر حفظ بيانات المنتج' })
                    return
                }

                const productId = res.data.id
                let createdSkcs = 0

                if (colorIds && colorIds.length > 0) {
                    const batch = await addSKCsBatch(productId, colorIds)
                    if (batch.success && batch.data) {
                        createdSkcs = batch.data.created
                        if (batch.data.skipped > 0) {
                            toast.warning(`تم تخطي ${batch.data.skipped.toLocaleString("ar-YE")} لون مكرر`)
                        }
                    } else {
                        toast.warning('تم إنشاء المنتج لكن فشل إضافة بعض الألوان', {
                            description: batch.error || 'يمكنك إضافتها من صفحة الأصناف',
                        })
                    }
                }

                if (createdSkcs > 0) {
                    toast.success('تم إنشاء المنتج', {
                        description: `تم إنشاء "${values.name}" مع ${createdSkcs.toLocaleString("ar-YE")} ${createdSkcs === 1 ? "صنف" : "أصناف"}`,
                    })
                } else {
                    toast.success('تم إنشاء المنتج', {
                        description: `تم إنشاء المنتج "${values.name}" — يمكنك إضافة الألوان من صفحة الأصناف`,
                    })
                }

                onSuccess?.()
                if (createdSkcs > 0) {
                    router.push(`/items?productId=${productId}`)
                } else {
                    router.refresh()
                }
            } catch {
                toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى التحقق من الاتصال والمحاولة مجدداً' })
            }
        })
    }

    function onInvalid() {
        toast.error("راجع البيانات المدخلة", {
            description: "توجد حقول إجبارية لم تقم بتعبئتها أو تم تعبئتها بشكل خاطئ."
        })
    }

    const optionalDetailsFields = (
        <>
            <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            الرابط (slug)
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="يُولَّد تلقائياً من الاسم إن تُرك فارغاً"
                                className="font-mono text-sm"
                                dir="ltr"
                                {...field}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                            <Textarea placeholder="وصف تفصيلي للمنتج..." className="min-h-[80px]" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-muted-foreground" />
                        الأسماء البديلة
                    </FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendAlternativeName("" as any)}>
                        <Plus className="h-3.5 w-3.5 ml-1" />
                        إضافة
                    </Button>
                </div>
                {alternativeNameFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField
                            control={form.control}
                            name={`alternativeNames.${index}`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder="اسم بديل..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAlternativeName(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <TagsField control={form.control} />
        </>
    )

    const createFormContent = (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
                <FormField
                    control={form.control}
                    name="productNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">رقم المنتج</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="001"
                                    className="font-mono uppercase"
                                    maxLength={3}
                                    dir="ltr"
                                    {...field}
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="col-span-2">
                            <FormLabel className="text-xs">اسم المنتج</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: آيفون 15..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">التصنيف</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingOptions ? "..." : "اختياري"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {flattenCategoryTree(categories).map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">البراند</FormLabel>
                            <Select
                                onValueChange={v => field.onChange(v === "none" ? null : v)}
                                value={field.value ?? "none"}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingOptions ? "..." : "اختياري"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">بدون براند</SelectItem>
                                    {brands.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="skuSpecKind"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">نوع مواصفة الصنف</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? DEFAULT_SKU_SPEC_KIND}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر النوع" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {SKU_SPEC_CONFIGS.map(cfg => (
                                    <SelectItem key={cfg.value} value={cfg.value}>
                                        {cfg.label} — {cfg.pluralLabel}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                            يحدد تسمية الحقل عند إضافة الأصناف (مقاس، عبوة، طول…)
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="space-y-2">
                <FormLabel className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    الألوان
                    <span className="text-xs text-muted-foreground font-normal">(اختياري)</span>
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                    يمكنك إضافة الأصناف لاحقاً من صفحة الأصناف
                </p>
                <FormField
                    control={form.control}
                    name="colorIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <ColorChipPicker
                                    selected={field.value ?? []}
                                    onChange={field.onChange}
                                    productNumber={watchedProductNumber}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <details className="group rounded-lg border border-border/60">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium list-none">
                    <span className="text-muted-foreground">تفاصيل إضافية (اختياري)</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-border/60 px-4 py-4">
                    {optionalDetailsFields}
                </div>
            </details>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                    إلغاء
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    إضافة المنتج
                </Button>
            </div>
        </div>
    )

    const dataCards = (
        <>
                {/* ─── Card 1: Basic Info ──────────────────────── */}
                <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">البيانات الأساسية</CardTitle>
                        </div>
                        <CardDescription>أدخل بيانات المنتج الأساسية ومواصفاته</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <FormField
                            control={form.control}
                            name="productNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        رقم المنتج
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="مثال: 001"
                                            className="font-mono text-sm uppercase tracking-widest focus-visible:ring-primary/20 max-w-[120px]"
                                            maxLength={3}
                                            dir="ltr"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <p className="text-[11px] text-muted-foreground">3 خانات — أحرف أو أرقام إنجليزية، فريد لكل منتج</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>اسم المنتج</FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: آيفون 15..." className="focus-visible:ring-primary/20" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Category + Brand */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>التصنيف</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                            <FormControl>
                                                <SelectTrigger className="w-full focus:ring-primary/20">
                                                    <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر التصنيف"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.length === 0 ? (
                                                    <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                        لا توجد تصنيفات
                                                    </div>
                                                ) : (
                                                    flattenCategoryTree(categories).map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.label}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="brandId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>البراند</FormLabel>
                                        <Select
                                            onValueChange={v => field.onChange(v === "none" ? null : v)}
                                            value={field.value ?? "none"}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full focus:ring-primary/20">
                                                    <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر البراند"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-muted-foreground text-sm">
                                                    بدون براند
                                                </SelectItem>
                                                {brands.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.name}
                                                        {b.code && (
                                                            <span className="mr-2 text-xs text-muted-foreground font-mono">{b.code}</span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="skuSpecKind"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>نوع مواصفة الصنف</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? DEFAULT_SKU_SPEC_KIND}>
                                        <FormControl>
                                            <SelectTrigger className="w-full focus:ring-primary/20">
                                                <SelectValue placeholder="اختر النوع" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {SKU_SPEC_CONFIGS.map(cfg => (
                                                <SelectItem key={cfg.value} value={cfg.value}>
                                                    {cfg.label} — {cfg.pluralLabel}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-xs">
                                        يحدد تسمية الحقل عند إضافة الأصناف (مقاس، عبوة، طول…)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                    </CardContent>
                </Card>

                {/* ─── Card 2: Description & Indexing ──────────── */}
                <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">تفاصيل وفهرسة</CardTitle>
                        </div>
                        <CardDescription>البيانات الوصفية التي تساعد في البحث والأرشفة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {optionalDetailsFields}
                    </CardContent>
                </Card>
        </>
    )

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any, onInvalid)} className={product ? "space-y-6 pb-24 relative" : "space-y-4"}>

                {product ? (
                    <Tabs defaultValue="data" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 mb-4">
                            <TabsTrigger value="data" className="gap-2">
                                <Package className="h-4 w-4" />
                                البيانات
                            </TabsTrigger>
                            <TabsTrigger value="units" className="gap-2">
                                <Scale className="h-4 w-4" />
                                وحدات القياس
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="data" className="space-y-6 mt-0">
                            {dataCards}
                        </TabsContent>
                        <TabsContent value="units" className="mt-0">
                            <UnitsPanel
                                productId={product.id}
                                productUnits={productUnits}
                                sysUnits={sysUnits}
                                onUnitsChange={setProductUnits}
                            />
                        </TabsContent>
                    </Tabs>
                ) : (
                    createFormContent
                )}

                {product && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="container max-w-5xl mx-auto flex items-center justify-between">
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium">تحديث بيانات المنتج</p>
                            <p className="text-xs text-muted-foreground">تأكد من صحة البيانات قبل الحفظ</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="flex-1 sm:flex-none border-dashed"
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 sm:flex-none bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md"
                            >
                                {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                حفظ التعديلات
                            </Button>
                        </div>
                    </div>
                </div>
                )}

            </form>
        </Form>
    )
}

// ─── Tags Sub-component (extracted to avoid hook-in-render) ──

function TagsField({ control }: { control: ReturnType<typeof useForm<FormValues>>['control'] }) {
    const [tagInput, setTagInput] = useState("")

    return (
        <div className="space-y-4 pt-4 border-t">
            <FormLabel className="text-base font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4 text-violet-500" />
                الوسوم (Tags)
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
                                {/* Tag Input */}
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="اكتب الوسم واضغط Enter..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="h-9 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addTag(tagInput)}
                                        disabled={!tagInput.trim()}
                                        className="h-9 px-3 bg-violet-500/10 border-violet-300 text-violet-700 hover:bg-violet-500/20 hover:text-violet-800 transition-all"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        إضافة
                                    </Button>
                                </div>

                                {/* Tags Display */}
                                {tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag: string, index: number) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="px-3 py-1.5 text-sm bg-linear-to-r from-violet-50 to-purple-50 text-violet-800 border-violet-200 hover:from-violet-100 hover:to-purple-100 hover:border-violet-300 transition-all duration-300 animate-in fade-in slide-in-from-left-2 gap-1.5 group"
                                            >
                                                <Hash className="h-3 w-3 text-violet-400" />
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(index)}
                                                    className="ml-1 text-violet-400 hover:text-destructive transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-3 text-muted-foreground text-sm">
                                        لا توجد وسوم مضافة. اكتب وسماً واضغط Enter أو زر إضافة.
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
