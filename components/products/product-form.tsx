"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Tag, Package, AlignLeft, Layers, Bookmark } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form, FormControl, FormDescription,
    FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { getCategories } from "@/lib/actions/categories"
import { getBrands } from "@/lib/actions/brands"
import type { ProductFormData } from "@/lib/types/product"

const productSchema = z.object({
    name: z.string().min(1, "اسم المنتج مطلوب"),
    code: z
        .string()
        .min(1, "الكود مطلوب")
        .max(32, "الكود بحد أقصى 32 خانة")
        .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "حروف/أرقام إنجليزية، ويمكن شرطة أو شرطة سفلية"),
    categoryId: z.string().min(1, "التصنيف مطلوب"),
    brandId: z.string().min(1, "البراند مطلوب"),
    description: z.string().nullable().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
    product?: ProductFormData
    onSuccess?: () => void
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const isEditing = !!product
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [categories, setCategories] = useState<{ id: string; name: string; code: string }[]>([])
    const [brands, setBrands] = useState<{ id: string; name: string; code: string }[]>([])
    const [loadingOpts, setLoadingOpts] = useState(true)

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        mode: "onChange",
        defaultValues: {
            name: product?.name ?? "",
            code: product?.code ?? "",
            categoryId: product?.categoryId ?? "",
            brandId: product?.brandId ?? "",
            description: product?.description ?? "",
        },
    })

    useEffect(() => {
        void Promise.all([getCategories(), getBrands()]).then(([catRes, brandRes]) => {
            if (catRes.success && catRes.data) setCategories(catRes.data as typeof categories)
            if (brandRes.success && brandRes.data) setBrands(brandRes.data as typeof brands)
            setLoadingOpts(false)
        })
    }, [])

    async function onSubmit(values: ProductFormValues) {
        setIsSubmitting(true)
        try {
            const payload = {
                name: values.name,
                code: values.code.toUpperCase(),
                categoryId: values.categoryId,
                brandId: values.brandId,
                description: values.description || null,
            }

            const res = isEditing
                ? await updateProduct(product.id, payload)
                : await createProduct(payload)

            if (res.success) {
                toast.success(isEditing ? "تم تحديث المنتج" : "تم إضافة المنتج")
                onSuccess?.()
            } else {
                toast.error(res.error ?? "حدث خطأ ما")
            }
        } catch {
            toast.error("خطأ غير متوقع — حاول مجدداً")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6 relative">
                <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات المنتج</CardTitle>
                        </div>
                        <CardDescription>
                            تعريف تجاري (SPU) — التصنيف والبراند هنا، والأسعار والأصناف منفصلة
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5" />
                                        الاسم <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: قميص قطني" className="focus-visible:ring-primary/20" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Tag className="h-3.5 w-3.5" />
                                        الكود <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="SHIRT-001"
                                            dir="ltr"
                                            maxLength={32}
                                            className="font-mono uppercase tracking-wide focus-visible:ring-primary/20"
                                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-[11px]">
                                        فريد — لربط الأصناف تحت نفس المنتج
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
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Bookmark className="h-3.5 w-3.5" />
                                        البراند <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger className="w-full focus:ring-primary/20">
                                                <SelectValue placeholder={loadingOpts ? "جاري التحميل..." : "اختر البراند"} />
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
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5" />
                                        التصنيف <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger className="w-full focus:ring-primary/20">
                                                <SelectValue placeholder={loadingOpts ? "جاري التحميل..." : "اختر التصنيف"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5">
                                        <AlignLeft className="w-3.5 h-3.5" />
                                        الوصف
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            placeholder="نبذة اختيارية..."
                                            className="resize-none focus-visible:ring-primary/20"
                                            rows={3}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="sticky bottom-0 left-0 right-0 z-10 pt-4 bg-background border-t border-border/50">
                    <div className="flex items-center justify-end w-full">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-11 bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md transition-all duration-300"
                        >
                            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "حفظ التعديلات" : "إضافة المنتج"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}
