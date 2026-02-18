"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createProduct, updateProduct } from "@/lib/actions/inventory"
import { uploadProductImage } from "@/lib/actions/upload"
import { getCategories } from "@/lib/actions/categories"
import { ImageGalleryUpload } from "@/components/ui/image-gallery-upload"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Product, Category } from "@prisma/client"
import { useState, useCallback, useEffect } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useDropzone } from "react-dropzone"
import Image from "next/image"
import { Loader2, UploadCloud, X, Trash2, Plus } from "lucide-react"
import type { ProductImage } from "@/lib/types/product"


// Helper component for Variant Image Upload
function VariantImageUpload({
    value,
    onChange,
    productItemNumber,
    variantName,
}: {
    value?: string | null
    onChange: (url: string) => void
    productItemNumber?: string
    variantName?: string
}) {
    const [isUploading, setIsUploading] = useState(false)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        if (!productItemNumber?.trim()) {
            toast.error('حقل مطلوب', { description: 'يُرجى إدخال رقم الصنف أولاً قبل رفع صورة الخيار' })
            return
        }

        setIsUploading(true)
        const slot = variantName ? `variant-${variantName.toLowerCase().replace(/\s+/g, '-')}` : `variant-${Date.now()}`
        const res = await uploadProductImage(file, productItemNumber, slot, 'variants', value || null)
        if (res.success && res.url) {
            onChange(res.url)
            toast.success('تم رفع الصورة', { description: 'تم حفظ صورة الخيار بنجاح وتحويلها إلى WebP' })
        } else {
            toast.error('فشل رفع الصورة', { description: res.error || 'تعذّر حفظ الصورة، يُرجى المحاولة مجدداً' })
        }
        setIsUploading(false)
    }, [onChange, productItemNumber, variantName, value])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif', '.bmp', '.tiff'] },
        maxFiles: 1,
        maxSize: 20 * 1024 * 1024,
        onDropRejected: (r) => {
            const err = r[0]?.errors[0]
            if (err?.code === 'file-too-large') toast.error('الملف كبير جداً', { description: 'الحد الأقصى المسموح هو 20MB' })
            else toast.error('صيغة غير مدعومة', { description: 'يُرجى استخدام JPG أو PNG أو WEBP أو AVIF' })
        }
    })

    if (value) {
        return (
            <div className="relative h-20 w-20 shrink-0">
                <Image
                    src={value}
                    alt="Variant"
                    fill
                    className="object-cover rounded-lg border border-border"
                />
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        )
    }

    return (
        <div
            {...getRootProps()}
            className={`
                h-20 w-20 shrink-0 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
        >
            <input {...getInputProps()} />
            {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
            )}
        </div>
    )
}

const formSchema = z.object({
    itemNumber: z.string().min(1, { message: "رقم الصنف مطلوب" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    brand: z.string().optional().nullable(),
    unit: z.string().min(1, { message: "الوحدة مطلوبة" }),
    categoryId: z.string().min(1, { message: "التصنيف مطلوب" }),
    tier: z.string().optional().nullable(),
    packaging: z.string().optional().nullable(),
    imagePath: z.string().optional().nullable(),
    images: z.array(z.object({
        url: z.string(),
        alt: z.string().optional(),
        isPrimary: z.boolean(),
        order: z.number().optional(),
    })).optional(),
    description: z.string().optional().nullable(),
    price: z.preprocess((val) => Number(val), z.number().min(0, { message: "السعر يجب أن يكون أكبر من 0" })),
    isAvailable: z.boolean().default(true),
    variants: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1, "اسم الخيار مطلوب"),
        price: z.union([z.string(), z.number()]).optional().nullable(),
        imagePath: z.string().optional().nullable(),
    })).optional(),
    alternativeNames: z.array(z.string().min(1, "الاسم البديل لا يمكن أن يكون فارغاً")).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ProductFormProps {
    product?: Product & { variants?: any[] }
    onSuccess?: () => void
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        const res = await getCategories(true) // Load only active categories
        if (res.success && res.data) {
            setCategories(res.data)
        }
    }

    const form = useForm({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            itemNumber: product?.itemNumber || "",
            name: product?.name || "",
            brand: (product as any)?.brand || "",
            unit: product?.unit || "",
            categoryId: (product as any)?.categoryId || "",
            tier: product?.tier || "",
            packaging: product?.packaging || "",
            imagePath: (product as any)?.imagePath || "",
            images: ((product as any)?.images as ProductImage[]) || [],
            description: product?.description || "",
            price: product ? Number(product.price) : 0,
            isAvailable: product?.isAvailable ?? true,
            variants: product?.variants?.map((v: any) => ({
                id: v.id,
                name: v.name,
                price: v.price ? Number(v.price) : "",
                imagePath: v.imagePath,
            })) || [],
            alternativeNames: (product as any)?.alternativeNames || [],
        },
    } as any)



    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "variants",
    })

    const { fields: alternativeNameFields, append: appendAlternativeName, remove: removeAlternativeName } = useFieldArray({
        control: form.control,
        name: "alternativeNames",
    })

    // Watch images and sync imagePath from primary
    const watchedImages = form.watch('images') as ProductImage[] | undefined
    const watchedItemNumber = form.watch('itemNumber')

    // Auto-sync imagePath from primary image
    useEffect(() => {
        const imgs = watchedImages || []
        const primary = imgs.find(i => i.isPrimary) || imgs[0]
        if (primary?.url) {
            form.setValue('imagePath', primary.url)
        } else if (imgs.length === 0) {
            form.setValue('imagePath', '')
        }
    }, [watchedImages, form])

    async function onSubmit(values: FormValues) {
        try {
            let res;
            if (product) {
                res = await updateProduct(product.id, values)
            } else {
                res = await createProduct(values)
            }

            if (res.success) {
                toast.success(product ? 'تم تحديث المنتج' : 'تم إنشاء المنتج', {
                    description: product
                        ? `تم حفظ التغييرات على المنتج "${values.name}" بنجاح`
                        : `تم إنشاء المنتج "${values.name}" وإضافته إلى المخزن`
                })
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error('فشل الحفظ', { description: 'تعذّر حفظ بيانات المنتج، يُرجى المحاولة مجدداً' })
            }
        } catch {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم، يُرجى التحقق من الاتصال والمحاولة مجدداً' })
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                {/* Multi-Image Gallery Upload */}
                <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <ImageGalleryUpload
                                    images={(field.value as ProductImage[]) || []}
                                    onChange={field.onChange}
                                    productItemNumber={watchedItemNumber || ""}
                                    maxImages={10}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="itemNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رقم الصنف</FormLabel>
                                <FormControl>
                                    <Input placeholder="رقم الصنف..." {...field} />
                                </FormControl>
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
                                    <Input placeholder="مثال: آيفون 15..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>التصنيف</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="اختر التصنيف" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.length === 0 ? (
                                            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                لا توجد تصنيفات نشطة
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
                        name="brand"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>البراند (العلامة التجارية)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Apple، Samsung..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الوحدة</FormLabel>
                                <FormControl>
                                    <Input placeholder="حبة، كرتون..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tier"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>المستوى (Tier)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tier A, B..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <FormField
                        control={form.control}
                        name="packaging"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>العبوة</FormLabel>
                                <FormControl>
                                    <Input placeholder="مثلاً: 12x500ml" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>السعر (ريال)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الوصف</FormLabel>
                            <FormControl>
                                <Textarea placeholder="وصف تفصيلي للمنتج..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
                                <FormLabel>
                                    متاح في المخزون
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />



                {/* Alternative Names Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-semibold">الأسماء البديلة (تسميات أخرى)</FormLabel>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendAlternativeName("")}
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

                {/* Variants Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-semibold">الخيارات / المتغيرات (ألوان، أنواع...)</FormLabel>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ name: "", price: "", imagePath: "" })}
                            className="bg-secondary/50 border-dashed"
                        >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            إضافة خيار
                        </Button>
                    </div>

                    {fields.length > 0 ? (
                        <div className="grid gap-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 animate-in fade-in slide-in-from-top-2">
                                    {/* Variant Image */}
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.imagePath`}
                                        render={({ field }) => (
                                            <FormControl>
                                                <VariantImageUpload
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    productItemNumber={watchedItemNumber}
                                                    variantName={form.watch(`variants.${index}.name`)}
                                                />
                                            </FormControl>
                                        )}
                                    />

                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name={`variants.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="الاسم (أحمر، كبير...)" className="h-9" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`variants.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input type="number" placeholder="السعر (اختياري)" className="h-9" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                            لا توجد خيارات مضافة لهذا المنتج.
                        </div>
                    )}
                </div>

                <Button type="submit" className="w-full">
                    {product ? "حفظ التعديلات" : "إضافة منتج جديد"}
                </Button>
            </form>
        </Form >
    )
}
