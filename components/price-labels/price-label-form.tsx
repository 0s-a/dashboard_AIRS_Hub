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
import { createPriceLabel, updatePriceLabel } from "@/lib/actions/price-labels"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PriceLabel } from "@prisma/client"

const formSchema = z.object({
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    notes: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PriceLabelFormProps {
    priceLabel?: PriceLabel
    onSuccess?: () => void
}

export function PriceLabelForm({ priceLabel, onSuccess }: PriceLabelFormProps) {
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: priceLabel?.name || "",
            notes: priceLabel?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            let res
            if (priceLabel) {
                res = await updatePriceLabel(priceLabel.id, values)
            } else {
                res = await createPriceLabel(values)
            }

            if (res.success) {
                toast.success(priceLabel ? "تم تحديث التسعيرة" : "تم إنشاء التسعيرة")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error(res.error || "حدث خطأ ما")
            }
        } catch (error) {
            toast.error("خطأ في الإرسال")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم التسعيرة *</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: سعر الجملة..." {...field} />
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

                <Button type="submit" className="w-full">
                    {priceLabel ? "حفظ التعديلات" : "إضافة تسعيرة جديدة"}
                </Button>
            </form>
        </Form>
    )
}
