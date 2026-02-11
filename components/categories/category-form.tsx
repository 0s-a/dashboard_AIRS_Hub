"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { createCategory, updateCategory } from "@/lib/actions/categories"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Category } from "@prisma/client"

const formSchema = z.object({
    itemNumber: z.string().optional(),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface CategoryFormProps {
    category?: Category
    onSuccess?: () => void
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemNumber: category?.itemNumber ?? undefined,
            name: category?.name || "",
            description: category?.description || "",
            icon: category?.icon || "",
            isActive: category?.isActive ?? true,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            let res
            if (category) {
                res = await updateCategory(category.id, values)
            } else {
                res = await createCategory(values)
            }

            if (res.success) {
                toast.success(category ? "تم تحديث التصنيف" : "تم إنشاء التصنيف")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error(res.error || "حدث خطأ ما")
            }
        } catch (error) {
            toast.error("خطأ في الإرسال")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="itemNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>رقم الصنف</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: CAT-001" {...field} />
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
                            <FormLabel>اسم التصنيف *</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: إلكترونيات..." {...field} />
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
                                <Textarea
                                    placeholder="وصف تفصيلي للتصنيف..."
                                    {...field}
                                    value={field.value || ""}
                                    className="resize-none"
                                    rows={3}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الأيقونة/الرمز</FormLabel>
                            <FormControl>
                                <Input placeholder="📱 أو emoji..." {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription className="text-xs">
                                يمكنك استخدام emoji أو نص
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
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
                                    التصنيف نشط
                                </FormLabel>
                                <FormDescription className="text-xs">
                                    التصنيفات النشطة فقط ستظهر في قائمة اختيار المنتجات
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full">
                    {category ? "حفظ التعديلات" : "إضافة تصنيف جديد"}
                </Button>
            </form>
        </Form>
    )
}
