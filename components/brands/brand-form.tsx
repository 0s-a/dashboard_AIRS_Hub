"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Tag, Bookmark, AlignLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form, FormControl, FormDescription,
    FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { createBrand, updateBrand } from "@/lib/actions/brands"
import type { BrandFormData } from "@/lib/types/brand"

// ─── Validation Schema ─────────────────────────────────────────

const brandSchema = z.object({
    name: z
        .string()
        .min(1, "اسم البراند مطلوب"),

    code: z
        .string()
        .length(1, "الكود يجب أن يكون حرفاً أو رقماً واحداً")
        .regex(/^[A-Za-z0-9]{1}$/, "الكود يجب أن يحتوي على حرف إنجليزي أو رقم فقط"),

    description: z
        .string()
        .nullable()
        .optional(),
})

type BrandFormValues = z.infer<typeof brandSchema>

// ─── Props ─────────────────────────────────────────────────────

interface BrandFormProps {
    /** If provided, the form operates in edit mode */
    brand?: BrandFormData
    onSuccess?: () => void
}

// ─── Component ─────────────────────────────────────────────────

export function BrandForm({ brand, onSuccess }: BrandFormProps) {
    const isEditing = !!brand
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<BrandFormValues>({
        resolver: zodResolver(brandSchema),
        mode: "onChange",
        defaultValues: {
            name:        brand?.name        ?? "",
            code:        brand?.code        ?? "",
            description: brand?.description ?? "",
        },
    })

    // ── Submit handler ──────────────────────────────────────────

    async function onSubmit(values: BrandFormValues) {
        setIsSubmitting(true)
        try {
            const payload = {
                name:        values.name,
                code:        values.code.toUpperCase(),
                description: values.description || null,
            }

            const res = isEditing
                ? await updateBrand(brand.id, payload)
                : await createBrand(payload)

            if (res.success) {
                toast.success(isEditing ? "تم تحديث البراند" : "تم إضافة البراند")
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

    // ── Render ──────────────────────────────────────────────────

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6 relative">
                <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Bookmark className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات البراند</CardTitle>
                        </div>
                        <CardDescription>إدارة معلومات العلامة التجارية الجديدة أو الحالية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {/* ── Brand Name ── */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Bookmark className="w-3.5 h-3.5" />
                                        اسم البراند <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: سامسونج" className="focus-visible:ring-primary/20" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* ── Brand Code ── */}
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
                                            placeholder="S"
                                            dir="ltr"
                                            maxLength={1}
                                            className="font-mono uppercase w-16 tracking-widest focus-visible:ring-primary/20"
                                            // Auto-uppercase as the user types
                                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-[11px]">
                                        حرف أو رقم إنجليزي واحد — يُستخدم في رقم المنتج
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* ── Description ── */}
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
                                            placeholder="نبذة عن البراند..."
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
                            disabled={isSubmitting}
                            className="w-full h-11 bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md transition-all duration-300"
                        >
                            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "حفظ التعديلات" : "إضافة البراند"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}
