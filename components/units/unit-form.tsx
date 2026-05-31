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
import { createUnit, updateUnit } from "@/lib/actions/units"
import { toast } from "sonner"
import { UnitRow } from "./columns"
import { Loader2, Box, AlignLeft, Layers, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const formSchema = z.object({
    name: z.string().min(1, { message: "اسم الوحدة مطلوب" }),
    pluralName: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface UnitFormProps {
    unit?: UnitRow
    onSuccess?: () => void
}

export function UnitForm({ unit, onSuccess }: UnitFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: unit?.name || "",
            pluralName: unit?.pluralName || "",
            notes: unit?.notes || "",
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
                            <Box className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات الوحدة</CardTitle>
                        </div>
                        <CardDescription>إدارة تفاصيل وحدة القياس</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5" />اسم الوحدة *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="مثال: حبة، كرتون، درزن، كيس..."
                                                className="focus-visible:ring-primary/20"
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
                                        <FormLabel className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />صيغة الجمع</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="مثال: حبات، كراتين، دسات..."
                                                className="focus-visible:ring-primary/20"
                                                {...field}
                                                value={field.value || ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" />ملاحظات</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="ملاحظات إضافية..."
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
                                unit ? "حفظ التعديلات" : "إضافة الوحدة"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}
