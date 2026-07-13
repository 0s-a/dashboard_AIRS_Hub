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
import {
    createProductAttribute,
    updateProductAttribute,
} from "@/lib/actions/product-attributes"
import type { SerializedProductAttributeCatalog } from "@/lib/types/product-attribute"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, Tags } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const formSchema = z.object({
    code: z
        .string()
        .min(2, { message: "الكود يجب أن يكون حرفين على الأقل" })
        .max(20, { message: "الكود يجب ألا يتجاوز 20 حرفاً" })
        .regex(/^[A-Za-z0-9_]+$/, { message: "أحرف إنجليزية أو أرقام أو _ فقط" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    examplesText: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ProductAttributeFormProps {
    attribute?: SerializedProductAttributeCatalog
    onSuccess?: () => void
}

function examplesToText(examples?: string[]): string {
    return examples?.length ? examples.join("\n") : ""
}

function textToExamples(text?: string): string[] {
    if (!text?.trim()) return []
    return text
        .split(/[\n,،]/)
        .map(s => s.trim())
        .filter(Boolean)
}

export function ProductAttributeForm({ attribute, onSuccess }: ProductAttributeFormProps) {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: attribute?.code ?? "",
            name: attribute?.name ?? "",
            examplesText: examplesToText(attribute?.examples),
        },
    })

    async function onSubmit(values: FormValues) {
        try {
            const payload = {
                code: values.code,
                name: values.name,
                examples: textToExamples(values.examplesText),
            }
            const res = attribute
                ? await updateProductAttribute(attribute.id, payload)
                : await createProductAttribute(payload)

            if (res.success) {
                toast.success(attribute ? "تم تحديث الصفة" : "تم إنشاء الصفة")
                onSuccess?.()
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
                            <Tags className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات الصفة</CardTitle>
                        </div>
                        <CardDescription>كود فريد + اسم عربي + أمثلة قيم اختيارية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الكود *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="color"
                                                maxLength={20}
                                                className="font-mono lowercase tracking-wide"
                                                dir="ltr"
                                                {...field}
                                                disabled={!!attribute}
                                                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            2–20 حرفاً — فريد عالمياً
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
                                        <FormLabel>اسم الصفة *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="اللون" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="examplesText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>أمثلة على القيم</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={"أحمر\nأزرق\nأخضر"}
                                            rows={5}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        سطر لكل قيمة (أو مفصولة بفاصلة) — اقتراحات سريعة عند تعبئة المنتج
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="sticky bottom-0 left-0 right-0 z-10 pt-4 bg-background border-t border-border/50">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-11">
                        {form.formState.isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                        ) : (
                            attribute ? "حفظ التعديلات" : "إضافة صفة جديدة"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
