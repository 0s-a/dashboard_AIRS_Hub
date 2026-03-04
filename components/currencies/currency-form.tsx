"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createCurrency, updateCurrency, getNextCurrencyItemNumber } from "@/lib/actions/currencies"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Currency } from "@prisma/client"
import { Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

const formSchema = z.object({
    itemNumber: z.string().min(1, "الرقم مطلوب").max(4, "الرقم يجب أن يكون 4 أرقام كحد أقصى"),
    name:      z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    code:      z.string().min(2, "الكود يجب أن يكون حرفين على الأقل").max(10),
    symbol:    z.string().min(1, "الرمز مطلوب"),
    isDefault: z.boolean(),
    isActive:  z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface CurrencyFormProps {
    currency?: Currency
    onSuccess?: () => void
}

export function CurrencyForm({ currency, onSuccess }: CurrencyFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemNumber: currency?.itemNumber || "",
            name:      currency?.name      || "",
            code:      currency?.code      || "",
            symbol:    currency?.symbol    || "",
            isDefault: currency?.isDefault || false,
            isActive:  currency?.isActive  ?? true,
        },
    })

    useEffect(() => {
        if (!currency) {
            getNextCurrencyItemNumber().then((num) => {
                form.setValue("itemNumber", num)
            })
        }
    }, [currency, form])

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        try {
            const res = currency
                ? await updateCurrency(currency.id, values)
                : await createCurrency(values)

            if (res.success) {
                toast.success(currency ? "تم تحديث العملة" : "تم إضافة العملة")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error(res.error || "حدث خطأ ما")
            }
        } catch {
            toast.error("خطأ غير متوقع")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="itemNumber" render={({ field }) => (
                        <FormItem>
                            <FormLabel>الرقم *</FormLabel>
                            <FormControl>
                                <Input placeholder="0001" {...field} className="font-mono" dir="ltr" maxLength={4} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم العملة *</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: ريال يمني" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem>
                                <FormLabel>الكود (ISO) *</FormLabel>
                                <FormControl>
                                    <Input placeholder="YER" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} className="font-mono" dir="ltr" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="symbol" render={({ field }) => (
                            <FormItem>
                                <FormLabel>الرمز *</FormLabel>
                                <FormControl>
                                    <Input placeholder="ر.ي" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <FormField control={form.control} name="isDefault" render={({ field }) => (
                            <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium cursor-pointer">العملة الافتراضية</FormLabel>
                                    <p className="text-xs text-muted-foreground">تُستخدم في التسعير تلقائياً</p>
                                </div>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="isActive" render={({ field }) => (
                            <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium cursor-pointer">مفعّلة</FormLabel>
                                    <p className="text-xs text-muted-foreground">تظهر في القوائم المنسدلة</p>
                                </div>
                            </FormItem>
                        )} />
                    </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                    ) : (
                        currency ? "حفظ التعديلات" : "إضافة عملة جديدة"
                    )}
                </Button>
            </form>
        </Form>
    )
}
