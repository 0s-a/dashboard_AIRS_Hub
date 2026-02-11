"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createProduct, updateProduct } from "@/lib/actions/inventory"
import { uploadImage } from "@/lib/actions/upload" // New Upload Action
import { getCategories } from "@/lib/actions/categories"
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
import { useDropzone } from "react-dropzone" // You need to install this: npm install react-dropzone
import Image from "next/image"
import { Loader2, UploadCloud, X, Trash2, Plus } from "lucide-react"


// Helper component for Variant Image Upload
function VariantImageUpload({ value, onChange }: { value?: string | null, onChange: (url: string) => void }) {
    const [isUploading, setIsUploading] = useState(false)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        const res = await uploadImage(formData)
        if (res.success && res.url) {
            onChange(res.url)
            toast.success("تم رفع صورة المتغير")
        } else {
            toast.error("فشل رفع الصورة")
        }
        setIsUploading(false)
    }, [onChange])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
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

// Schema Updated
const formSchema = z.object({
    itemNumber: z.string().min(1, { message: "رقم الصنف مطلوب" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    brand: z.string().optional().nullable(),
    unit: z.string().min(1, { message: "الوحدة مطلوبة" }),
    categoryId: z.string().min(1, { message: "التصنيف مطلوب" }),
    tier: z.string().optional().nullable(),
    packaging: z.string().optional().nullable(),
    imagePath: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    price: z.preprocess((val) => Number(val), z.number().min(0, { message: "السعر يجب أن يكون أكبر من 0" })),
    isAvailable: z.boolean().default(true),
    variants: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1, "اسم الخيار مطلوب"),
        price: z.union([z.string(), z.number()]).optional().nullable(),
        imagePath: z.string().optional().nullable(),
    })).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ProductFormProps {
    product?: Product & { variants?: any[] }
    onSuccess?: () => void
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
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
            imagePath: product?.imagePath || "",
            description: product?.description || "",
            price: product ? Number(product.price) : 0,
            isAvailable: product?.isAvailable ?? true,
            variants: product?.variants?.map(v => ({
                id: v.id,
                name: v.name,
                price: v.price ? Number(v.price) : "",
                imagePath: v.imagePath,
            })) || [],
        },
    } as any)

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "variants",
    })

    // Drag & Drop Handling
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        const res = await uploadImage(formData)
        if (res.success && res.url) {
            form.setValue('imagePath', res.url)
            toast.success("تم رفع الصورة بنجاح")
        } else {
            toast.error("فشل رفع الصورة")
        }
        setIsUploading(false)
    }, [form])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
    })

    async function onSubmit(values: FormValues) {
        try {
            let res;
            if (product) {
                res = await updateProduct(product.id, values)
            } else {
                res = await createProduct(values)
            }

            if (res.success) {
                toast.success(product ? "تم تحديث المنتج" : "تم إنشاء المنتج")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error("حدث خطأ ما")
            }
        } catch (error) {
            toast.error("خطأ في الإرسال")
        }
    }

    const currentImage = form.watch('imagePath')

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                {/* Image Upload Zone */}
                <div className="flex flex-col gap-2">
                    <FormLabel>صورة المنتج</FormLabel>
                    <div
                        {...getRootProps()}
                        className={`
                            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                            ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
                        `}
                    >
                        <input {...getInputProps()} />
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">جاري الرفع...</p>
                            </div>
                        ) : currentImage ? (
                            <div className="relative group w-full h-40 flex items-center justify-center">
                                <Image
                                    src={currentImage}
                                    alt="Preview"
                                    fill
                                    className="object-contain rounded-md"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                    <p className="text-white font-medium">تغيير الصورة</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        form.setValue('imagePath', '')
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">اسحب الصورة هنا أو اضغط للاختيار</p>
                            </div>
                        )}
                    </div>
                </div>

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
