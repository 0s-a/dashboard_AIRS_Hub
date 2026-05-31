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
import { Loader2, FolderTree, Tag, Info, List, Component } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6 relative">
                <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <FolderTree className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات التصنيف</CardTitle>
                        </div>
                        <CardDescription>إدارة معلومات تصنيفات المنتجات</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Code */}
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />كود التصنيف *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="مثال: ELC"
                                                maxLength={3}
                                                className="font-mono uppercase tracking-widest text-center text-lg w-full md:w-32 focus-visible:ring-primary/20"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(e.target.value.toUpperCase())
                                                }
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            3 أحرف إنجليزية أو أرقام
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
                                        <FormLabel className="flex items-center gap-1.5"><List className="w-3.5 h-3.5" />اسم التصنيف *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="مثال: إلكترونيات..." className="focus-visible:ring-primary/20" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Icon - Replaced emoji with simple text/icon reference */}
                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5"><Component className="w-3.5 h-3.5" />الأيقونة/الرمز</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="اكتب اسم أيقونة (مثال: laptop, phone)..."
                                            className="focus-visible:ring-primary/20"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        يستخدم لعرض أيقونة مميزة للتصنيف
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
                                    <FormLabel className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />الوصف</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="وصف تفصيلي للتصنيف..."
                                            {...field}
                                            value={field.value || ""}
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

                {/* Sticky Action Bar */}
                <div className="sticky bottom-0 left-0 right-0 z-10 pt-4 bg-background border-t border-border/50">
                    <div className="flex items-center justify-end w-full">
                        <Button 
                            type="submit" 
                            disabled={form.formState.isSubmitting}
                            className="w-full h-11 bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md transition-all duration-300"
                        >
                            {form.formState.isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                            ) : (
                                category ? "حفظ التعديلات" : "إضافة تصنيف جديد"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}
