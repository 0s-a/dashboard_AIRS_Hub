"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Tag } from "lucide-react"
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
        .length(2, "الكود يجب أن يكون حرفين بالضبط")
        .regex(/^[A-Za-z]{2}$/, "الكود يجب أن يحتوي على حروف إنجليزية فقط"),

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* ── Brand Name ── */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                اسم البراند <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: سامسونج" {...field} />
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
                            <FormLabel className="flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5" />
                                الكود <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="SM"
                                    dir="ltr"
                                    maxLength={2}
                                    className="font-mono uppercase w-20 tracking-widest"
                                    // Auto-uppercase as the user types
                                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                                />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                                حرفان إنجليزيان — يُستخدم في رقم الصنف
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
                            <FormLabel>الوصف</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="نبذة عن البراند..."
                                    className="resize-none"
                                    rows={3}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Submit ── */}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "حفظ التعديلات" : "إضافة البراند"}
                </Button>

            </form>
        </Form>
    )
}
