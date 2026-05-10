"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Trash2, Plus, Hash } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { createProduct, updateProduct } from "@/lib/actions/inventory"
import { getCategories } from "@/lib/actions/categories"
import { getBrands } from "@/lib/actions/brands"
import type { SerializedProduct } from "@/lib/actions/inventory"

// ─── Schema ──────────────────────────────────────────────────

const formSchema = z.object({
    itemNumber: z.string().optional().nullable(),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    brandId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    isAvailable: z.boolean().default(true),
    categoryId: z.string().optional().nullable(),
    alternativeNames: z.array(z.string().min(1, "الاسم البديل لا يمكن أن يكون فارغاً")).optional(),
    tags: z.array(z.string().min(1, "التاغ لا يمكن أن يكون فارغاً")).optional(),
})

type FormValues = z.infer<typeof formSchema>

// ─── Option types ────────────────────────────────────────────

type CategoryOption = { id: string; name: string; code: string; icon: string | null }
type BrandOption = { id: string; name: string; code: string }

// ─── Props ───────────────────────────────────────────────────

interface ProductFormProps {
    product?: SerializedProduct
    onSuccess?: () => void
}

// ─── Component ───────────────────────────────────────────────

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [brands, setBrands] = useState<BrandOption[]>([])
    const [isLoadingOptions, setIsLoadingOptions] = useState(true)

    // Load dropdown options on mount
    useEffect(() => {
        async function loadOptions() {
            const [catRes, brandRes] = await Promise.all([
                getCategories(),
                getBrands(),
            ])
            if (catRes.success && catRes.data) setCategories(catRes.data as CategoryOption[])
            if (brandRes.success && brandRes.data) setBrands(brandRes.data as BrandOption[])
            setIsLoadingOptions(false)
        }
        loadOptions()
    }, [])

    // ── Form setup ───────────────────────────────────────────

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            itemNumber:       product?.itemNumber ?? "",
            name:             product?.name ?? "",
            brandId:          product?.brandId ?? null,
            description:      product?.description ?? "",
            categoryId:       product?.categoryId ?? "",
            isAvailable:      product?.isAvailable ?? true,
            alternativeNames: (product?.alternativeNames as string[]) ?? [],
            tags:             (product?.tags as string[]) ?? [],
        },
    })

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
        try {
            const res = product
                ? await updateProduct(product.id, values)
                : await createProduct(values)

            if (res.success) {
                toast.success(product ? 'تم تحديث المنتج' : 'تم إنشاء المنتج', {
                    description: product
                        ? `تم حفظ التغييرات على المنتج "${values.name}" بنجاح`
                        : `تم إنشاء المنتج "${values.name}" وإضافته إلى المخزن`
                })
                onSuccess?.()
                router.refresh()
            } else {
                toast.error('فشل الحفظ', { description: 'تعذّر حفظ بيانات المنتج، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى التحقق من الاتصال والمحاولة مجدداً' })
        }
    }

    function onInvalid() {
        toast.error("راجع البيانات المدخلة", {
            description: "توجد حقول إجبارية لم تقم بتعبئتها أو تم تعبئتها بشكل خاطئ في إحدى التبويبات."
        })
    }

    // ── Render ────────────────────────────────────────────────

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any, onInvalid)} className="space-y-8 pb-20 relative">

                {/* Sticky Action Bar */}
                <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">
                            {product ? "تعديل المنتج" : "منتج جديد"}
                        </h2>
                        <p className="text-sm text-muted-foreground hidden sm:block">
                            {product ? "قم بتحديث بيانات المنتج والأسعار المرتبطة به" : "أدخل بيانات المنتج الجديد ومواصفاته"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            إلغاء
                        </Button>
                        <Button type="submit">
                            {product ? "حفظ التعديلات" : "إضافة المنتج"}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
                        <TabsTrigger value="indexing">الوصف والفهرسة</TabsTrigger>
                    </TabsList>

                    {/* ─── TAB 1: Basic Info ──────────────────────── */}
                    <TabsContent value="basic" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>البيانات الأساسية</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Product Code — Read-only (auto-generated on creation) */}
                                {product && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                        <Hash className="h-4 w-4 text-primary" />
                                        <span className="text-sm text-muted-foreground">الرقم المركب:</span>
                                        <span className="font-mono text-sm font-bold text-primary tracking-wider">
                                            {(product as any).productCode}
                                        </span>
                                    </div>
                                )}

                                {/* Name + Item Number (optional) */}
                                <div className="grid grid-cols-1 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>اسم المنتج</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="مثال: آيفون 15..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="itemNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>رقم الصنف (اختياري)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="رقم يدوي اختياري..." {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Category + Brand */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>التصنيف</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder={isLoadingOptions ? "جاري التحميل..." : "اختر التصنيف"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {categories.length === 0 ? (
                                                            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                                لا توجد تصنيفات
                                                            </div>
                                                        ) : (
                                                            categories.map((cat) => (
                                                                <SelectItem key={cat.id} value={cat.id}>
                                                                    {cat.icon && <span className="ml-2">{cat.icon}</span>}
                                                                    {cat.name}
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
                                                        <SelectTrigger className="w-full">
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

                                {/* Availability — placed in basic tab where users expect it */}
                                <FormField
                                    control={form.control}
                                    name="isAvailable"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-4 shadow-sm">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>متاح في المخزون</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─── TAB 2: Description & Indexing ──────────── */}
                    <TabsContent value="indexing" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>تفاصيل وفهرسة</CardTitle>
                                <CardDescription>البيانات الوصفية التي تساعد في البحث والأرشفة</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الوصف</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="وصف تفصيلي للمنتج..." {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* ─── Alternative Names Section ──────────── */}
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-base font-semibold">الأسماء البديلة (تسميات أخرى)</FormLabel>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appendAlternativeName("" as any)}
                                            className="bg-secondary/50 border-dashed"
                                        >
                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                            إضافة اسم بديل
                                        </Button>
                                    </div>

                                    {alternativeNameFields.length > 0 ? (
                                        <div className="grid gap-3">
                                            {alternativeNameFields.map((field, index) => (
                                                <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 animate-in fade-in slide-in-from-top-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`alternativeNames.${index}`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormControl>
                                                                    <Input placeholder="الاسم البديل للمنتج..." className="h-9" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeAlternativeName(index)}
                                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                                            لا توجد أسماء بديلة مضافة لهذا المنتج.
                                        </div>
                                    )}
                                </div>

                                {/* ─── Tags Section ────────────────────────── */}
                                <TagsField control={form.control} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
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
