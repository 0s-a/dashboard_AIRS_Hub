"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { Switch } from "@/components/ui/switch"
import { createUnit, updateUnit } from "@/lib/actions/units"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Unit shape (raw from DB since Prisma type may be stale)
interface UnitData {
    id: string
    itemNumber: string
    name: string
    pluralName?: string | null
    quantity?: number | null
    notes?: string | null
    isActive: boolean
}

const formSchema = z.object({
    name: z.string().min(1, { message: "اسم الوحدة مطلوب" }),
    pluralName: z.string().nullable().optional(),
    quantity: z.number().int().positive().nullable().optional(),
    notes: z.string().nullable().optional(),
    isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface UnitFormProps {
    unit?: UnitData
    onSuccess?: () => void
}

export function UnitForm({ unit, onSuccess }: UnitFormProps) {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: unit?.name || "",
            pluralName: unit?.pluralName || "",
            quantity: unit?.quantity ?? null,
            notes: unit?.notes || "",
            isActive: unit?.isActive ?? true,
        },
    })

    async function onSubmit(values: FormValues) {
        try {
            const res = unit
                ? await updateUnit(unit.id, values)
                : await createUnit(values)

            if (res.success) {
                toast.success(unit ? "تم تحديث الوحدة" : "تم إنشاء الوحدة")
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Name */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم الوحدة *</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="مثال: حبة، كرتون، درزن، كيس..."
                                    autoFocus
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Plural */}
                <FormField
                    control={form.control}
                    name="pluralName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>صيغة الجمع</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="مثال: حبات، كراتين، دسات..."
                                    {...field}
                                    value={field.value || ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Quantity */}
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الكمية الافتراضية للوحدة</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="مثال: 12 للدرزن، 24 للكرتون..."
                                    dir="ltr"
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                        field.onChange(e.target.value ? parseInt(e.target.value) : null)
                                    }
                                />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                                الكمية الافتراضية تُستخدم عند اختيار هذه الوحدة في التسعير
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Notes */}
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ملاحظات</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="ملاحظات إضافية..."
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

                {/* Active toggle */}
                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4 bg-linear-to-r from-muted/30 to-transparent shadow-xs hover:border-border transition-colors">
                            <div>
                                <FormLabel className="text-sm font-semibold text-foreground">الوحدة نشطة</FormLabel>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    الوحدات النشطة فقط تظهر في قوائم التسعير
                                </p>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full h-11 rounded-xl shadow-md font-bold mt-2" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting
                        ? "جاري الحفظ..."
                        : unit ? "حفظ التعديلات" : "إضافة الوحدة"}
                </Button>
            </form>
        </Form>
    )
}
