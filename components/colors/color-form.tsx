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
import { Switch } from "@/components/ui/switch"
import { createColor, updateColor } from "@/lib/actions/colors"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Color } from "@prisma/client"
import { Loader2, Palette, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { COLOR_CODE_CONFIG } from "@/lib/config/color.config"

const formSchema = z.object({
    code: z
        .string()
        .min(COLOR_CODE_CONFIG.minLength, {
            message: `الكود يجب أن يكون ${COLOR_CODE_CONFIG.minLength} أحرف على الأقل`,
        })
        .max(COLOR_CODE_CONFIG.maxLength, {
            message: `الكود يجب ألا يتجاوز ${COLOR_CODE_CONFIG.maxLength} أحرف`,
        })
        .regex(/^[A-Za-z0-9]{2,4}$/, { message: "أحرف إنجليزية أو أرقام فقط (2–4)" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "استخدم صيغة #RRGGBB" }),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ColorFormProps {
    color?: Color
    onSuccess?: () => void
}

export function ColorForm({ color, onSuccess }: ColorFormProps) {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: color?.code ?? "",
            name: color?.name ?? "",
            hexCode: color?.hexCode ?? "#6366F1",
            order: color?.order ?? 0,
            isActive: color?.isActive ?? true,
        },
    })

    const watchHex = form.watch("hexCode")

    async function onSubmit(values: FormValues) {
        try {
            const payload = {
                code: values.code,
                name: values.name,
                hexCode: values.hexCode,
                order: values.order ?? 0,
                isActive: values.isActive ?? true,
            }
            const res = color
                ? await updateColor(color.id, payload)
                : await createColor(payload)

            if (res.success) {
                toast.success(color ? "تم تحديث اللون" : "تم إنشاء اللون")
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
                            <Palette className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات اللون</CardTitle>
                        </div>
                        <CardDescription>كود 2–4 أحرف فريد + اسم عربي + HEX</CardDescription>
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
                                            كود اللون *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="RD"
                                                maxLength={COLOR_CODE_CONFIG.maxLength}
                                                className="font-mono uppercase tracking-widest"
                                                {...field}
                                                disabled={!!color}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            {COLOR_CODE_CONFIG.minLength}–{COLOR_CODE_CONFIG.maxLength} أحرف — فريد عالمياً
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
                                        <FormLabel>اسم اللون *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="أحمر" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="hexCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>لون HEX *</FormLabel>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="h-10 w-10 rounded-lg border shrink-0"
                                            style={{ backgroundColor: watchHex || "#ccc" }}
                                        />
                                        <FormControl>
                                            <Input
                                                placeholder="#EF4444"
                                                dir="ltr"
                                                className="font-mono"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <input
                                            type="color"
                                            value={watchHex?.match(/^#[0-9A-Fa-f]{6}$/) ? watchHex : "#6366F1"}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            className="h-10 w-10 cursor-pointer rounded border"
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="order"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الترتيب</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                        <FormLabel>نشط</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="sticky bottom-0 left-0 right-0 z-10 pt-4 bg-background border-t border-border/50">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-11">
                        {form.formState.isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                        ) : (
                            color ? "حفظ التعديلات" : "إضافة لون جديد"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
