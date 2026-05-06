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
import { createCategory, updateCategory } from "@/lib/actions/categories"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Category } from "@prisma/client"

const formSchema = z.object({
    code: z
        .string()
        .min(3, { message: "الكود يجب أن يكون 3 خانات بالضبط" })
        .max(3, { message: "الكود يجب أن يكون 3 خانات فقط" })
        .regex(/^[A-Za-z0-9]{3}$/, { message: "الكود يجب أن يحتوي على أحرف إنجليزية أو أرقام فقط" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CategoryFormProps {
    category?: Category
    onSuccess?: () => void
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: category?.code ?? "",
            name: category?.name || "",
            description: category?.description || "",
            icon: category?.icon || "",
        },
    })

    async function onSubmit(values: FormValues) {
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
        } catch {
            toast.error("خطأ في الإرسال")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Code — الحقل الأول والأهم */}
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>كود التصنيف *</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="مثال: ELC"
                                    maxLength={3}
                                    className="font-mono uppercase tracking-widest text-center text-lg w-28"
                                    {...field}
                                    onChange={(e) =>
                                        field.onChange(e.target.value.toUpperCase())
                                    }
                                />
                            </FormControl>
                            <FormDescription className="text-xs">
                                3 أحرف إنجليزية أو أرقام — مثال: ELC، A12، MOB
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Name */}
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

                {/* Icon */}
                <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الأيقونة/الرمز</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="📱 أو emoji..."
                                    {...field}
                                    value={field.value || ""}
                                />
                            </FormControl>
                            <FormDescription className="text-xs">
                                يمكنك استخدام emoji أو نص
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Description */}
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

                <Button type="submit" className="w-full">
                    {category ? "حفظ التعديلات" : "إضافة تصنيف جديد"}
                </Button>
            </form>
        </Form>
    )
}
