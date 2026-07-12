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
import { createProductAttribute, updateProductAttribute } from "@/lib/actions/product-attributes"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ProductAttribute } from "@prisma/client"
import { Loader2, SlidersHorizontal, Tag, List, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const formSchema = z.object({
    code: z
        .string()
        .min(2, { message: "الكود يجب أن يكون حرفين على الأقل" })
        .max(10, { message: "الكود يجب ألا يتجاوز 10 أحرف" })
        .regex(/^[A-Za-z0-9_]+$/, { message: "الكود يجب أن يحتوي على أحرف إنجليزية أو أرقام أو _ فقط" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    description: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AttributeFormProps {
    attribute?: ProductAttribute
    onSuccess?: () => void
}

export function AttributeForm({ attribute, onSuccess }: AttributeFormProps) {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: attribute?.code ?? "",
            name: attribute?.name || "",
            description: attribute?.description || "",
        },
    })

    async function onSubmit(values: FormValues) {
        try {
            const payload = {
                code: values.code,
                name: values.name,
                description: values.description || null,
            }
            let res
            if (attribute) {
                res = await updateProductAttribute(attribute.id, payload)
            } else {
                res = await createProductAttribute(payload)
            }

            if (res.success) {
                toast.success(attribute ? "تم تحديث الصفة" : "تم إنشاء الصفة")
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
                            <SlidersHorizontal className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات الصفة</CardTitle>
                        </div>
                        <CardDescription>تعريف اسم الصفة في الكتالوج المرجعي</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5" />
                                            كود الصفة *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="مثال: COLOR"
                                                maxLength={10}
                                                className="font-mono uppercase tracking-widest focus-visible:ring-primary/20"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(e.target.value.toUpperCase())
                                                }
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            2–10 أحرف إنجليزية أو أرقام أو _
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">
                                            <List className="w-3.5 h-3.5" />
                                            اسم الصفة *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="مثال: لون"
                                                className="focus-visible:ring-primary/20"
                                                {...field}
                                            />
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
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5" />
                                        الوصف
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="وصف اختياري للصفة..."
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
                                attribute ? "حفظ التعديلات" : "إضافة صفة جديدة"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}
