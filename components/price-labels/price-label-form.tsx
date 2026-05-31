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
import { createPriceLabel, updatePriceLabel, getNextPriceLabelItemNumber } from "@/lib/actions/price-labels"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PriceLabel } from "@prisma/client"
import { useEffect, useState } from "react"
import { Loader2, Tags, Hash, AlignLeft, Users, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
const formSchema = z.object({
    itemNumber: z.string().min(1, { message: "الرقم مطلوب" }).max(4, { message: "الرقم يجب أن يكون 4 أرقام كحد أقصى" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    customerType: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    isDefault: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface PriceLabelFormProps {
    priceLabel?: PriceLabel
    onSuccess?: () => void
}

export function PriceLabelForm({ priceLabel, onSuccess }: PriceLabelFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemNumber: priceLabel?.itemNumber || "",
            name: priceLabel?.name || "",
            customerType: (priceLabel as any)?.customerType || "",
            notes: priceLabel?.notes || "",
            isDefault: priceLabel?.isDefault || false,
        },
    })

    useEffect(() => {
        if (!priceLabel) {
            getNextPriceLabelItemNumber().then((num) => {
                form.setValue("itemNumber", num)
            })
        }
    }, [priceLabel, form])

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        try {
            const payload = {
                itemNumber: values.itemNumber,
                name: values.name,
                customerType: values.customerType || null,
                notes: values.notes,
                isDefault: values.isDefault,
            }

            const res = priceLabel
                ? await updatePriceLabel(priceLabel.id, payload)
                : await createPriceLabel(payload)

            if (res.success) {
                toast.success(priceLabel ? "تم تحديث التسعيرة" : "تم إنشاء التسعيرة")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error(res.error || "حدث خطأ ما")
            }
        } catch {
            toast.error("خطأ في الإرسال")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6 relative">
                <Card className="border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Tags className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">بيانات التسعيرة</CardTitle>
                        </div>
                        <CardDescription>أدخل تفاصيل ومواصفات التسعيرة الجديدة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="itemNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />الرقم *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0001" {...field} className="font-mono focus-visible:ring-primary/20" dir="ltr" maxLength={4} />
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
                                        <FormLabel className="flex items-center gap-1.5"><Tags className="w-3.5 h-3.5" />اسم التسعيرة *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="مثال: سعر الجملة..." className="focus-visible:ring-primary/20" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="customerType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />نوع العميل</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="مثال: عميل جملة، عميل مفرد، VIP..."
                                            className="focus-visible:ring-primary/20"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

                        <FormField control={form.control} name="isDefault" render={({ field }) => (
                            <FormItem className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 shadow-sm hover:border-primary/20 transition-colors">
                                <FormControl>
                                    <Switch 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                                        التسعيرة الافتراضية
                                    </FormLabel>
                                    <p className="text-[11px] text-muted-foreground mt-1.5">يتم اختيارها تلقائياً عند إضافة سعر جديد</p>
                                </div>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                {/* Sticky Action Bar for Dialogs/Sheets */}
                <div className="sticky bottom-0 left-0 right-0 z-10 pt-4 bg-background border-t border-border/50">
                    <div className="flex items-center gap-3 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1 border-dashed"
                        >
                            إلغاء
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-[2] bg-linear-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md transition-all duration-300"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                            ) : (
                                priceLabel ? "حفظ التعديلات" : "إضافة تسعيرة جديدة"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}
