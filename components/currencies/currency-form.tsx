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
import { Loader2, ArrowLeftRight, Info } from "lucide-react"
import { useState, useEffect } from "react"
import type { SerializedCurrency } from "@/app/(dashboard)/currencies/page"

const formSchema = z.object({
    itemNumber:   z.string().min(1, "الرقم مطلوب").max(4, "الرقم يجب أن يكون 4 أرقام كحد أقصى"),
    name:         z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    code:         z.string().min(2, "الكود يجب أن يكون حرفين على الأقل").max(10),
    symbol:       z.string().min(1, "الرمز مطلوب"),
    exchangeRate: z.string().optional(),   // stored as string; converted to Decimal on server
    isDefault:    z.boolean(),
    isActive:     z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface CurrencyFormProps {
    currency?: SerializedCurrency
    onSuccess?: () => void
    /** Symbol of the default/base currency (shown in exchange rate hint) */
    baseCurrencySymbol?: string
}

export function CurrencyForm({ currency, onSuccess, baseCurrencySymbol = "ر.ي" }: CurrencyFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemNumber:   currency?.itemNumber  || "",
            name:         currency?.name        || "",
            code:         currency?.code        || "",
            symbol:       currency?.symbol      || "",
            exchangeRate: currency?.exchangeRate != null ? String(currency.exchangeRate) : "",
            isDefault:    currency?.isDefault   || false,
            isActive:     currency?.isActive    ?? true,
        },
    })

    const watchedIsDefault = form.watch("isDefault")
    const watchedSymbol    = form.watch("symbol")
    const watchedRate      = form.watch("exchangeRate")

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
            const exchangeRate = values.exchangeRate?.trim()
                ? parseFloat(values.exchangeRate)
                : null

            if (exchangeRate !== null && (isNaN(exchangeRate) || exchangeRate <= 0)) {
                toast.error("سعر الصرف يجب أن يكون رقماً موجباً")
                setIsSubmitting(false)
                return
            }

            // Build payload explicitly — do NOT spread `values.exchangeRate` (it's a string in the form)
            const payload = {
                itemNumber:   values.itemNumber,
                name:         values.name,
                code:         values.code,
                symbol:       values.symbol,
                isDefault:    values.isDefault,
                isActive:     values.isActive,
                exchangeRate: values.isDefault ? null : exchangeRate,
            }

            const res = currency
                ? await updateCurrency(currency.id, payload)
                : await createCurrency(payload)

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

                    {/* ── سعر الصرف ─────────────────────────────────────────── */}
                    {!watchedIsDefault && (
                        <FormField control={form.control} name="exchangeRate" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5">
                                    <ArrowLeftRight className="size-3.5 text-muted-foreground" />
                                    سعر الصرف
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            step="0.000001"
                                            min="0"
                                            placeholder="530.00"
                                            dir="ltr"
                                            className="font-mono pl-24"
                                            {...field}
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                                            {baseCurrencySymbol} / {watchedSymbol || "؟"}
                                        </div>
                                    </div>
                                </FormControl>
                                {/* Live hint */}
                                {watchedRate && parseFloat(watchedRate) > 0 && (
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                                        <Info className="size-3 shrink-0" />
                                        1 {baseCurrencySymbol} = {(1 / parseFloat(watchedRate)).toFixed(6)} {watchedSymbol || "؟"}
                                        &nbsp;|&nbsp;
                                        1 {watchedSymbol || "؟"} = {parseFloat(watchedRate).toFixed(2)} {baseCurrencySymbol}
                                    </p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <FormField control={form.control} name="isDefault" render={({ field }) => (
                            <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium cursor-pointer">العملة الرئيسية</FormLabel>
                                    <p className="text-xs text-muted-foreground">التسعير يُدخَل بها تلقائياً</p>
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
