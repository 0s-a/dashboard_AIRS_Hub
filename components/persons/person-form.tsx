"use client"
import React from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updatePerson } from "@/lib/actions/persons"
import { getPriceLabels } from "@/lib/actions/price-labels"
import { getActiveCurrencies } from "@/lib/actions/currencies"
import { contactSchema, type ContactInput } from "@/lib/validations/person"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Person } from "@prisma/client"
import { User, Phone, Mail, Loader2, Tag, Plus, X, MessageCircle, Globe, Wallet, Coins, UsersRound } from "lucide-react"
import { useState, useEffect } from "react"
import { MultiSelect, OptionType } from "@/components/ui/multi-select"
import { TagInput } from "@/components/ui/tag-input"

const formSchema = z.object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    source: z.string().optional(),
    contacts: z.array(contactSchema).superRefine((contacts, ctx) => {
        const seen = new Map<string, number>()
        contacts.forEach((c, i) => {
            const key = `${c.type}:${c.value.trim()}`
            if (seen.has(key)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [i, 'value'],
                    message: 'هذا الرقم/البريد مكرر في القائمة',
                })
            } else {
                seen.set(key, i)
            }
        })
    }),
    tags: z.array(z.string()).optional(),
    priceLabelIds: z.array(z.string()).optional(),
    currencyIds: z.array(z.string()).optional(),
    groupName: z.string().optional(),
    groupNumber: z.string().optional(),
})

type FormValues = z.input<typeof formSchema>

interface PersonFormProps {
    person: Person
    onSuccess?: () => void
}

const contactTypeLabels: Record<string, { label: string; icon: any; placeholder: string }> = {
    phone: { label: "هاتف", icon: Phone, placeholder: "0501234567" },
    email: { label: "بريد إلكتروني", icon: Mail, placeholder: "example@domain.com" },
    whatsapp: { label: "واتساب", icon: MessageCircle, placeholder: "0501234567" },
}

export const PersonForm = React.memo(function PersonForm({ person, onSuccess }: PersonFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [priceLabels, setPriceLabels] = useState<OptionType[]>([])
    const [currencyOptions, setCurrencyOptions] = useState<OptionType[]>([])

    useEffect(() => {
        const fetchAll = async () => {
            const [priceLabelsRes, currenciesRes] = await Promise.all([
                getPriceLabels(),
                getActiveCurrencies(),
            ])
            if (priceLabelsRes.success && priceLabelsRes.data) {
                setPriceLabels(priceLabelsRes.data.map(l => ({ label: l.name, value: l.id })))
            }
            if (currenciesRes.success && currenciesRes.data) {
                setCurrencyOptions(currenciesRes.data.map(c => ({ label: `${c.symbol} — ${c.name}`, value: c.id })))
            }
        }
        fetchAll()
    }, [])

    // Parse existing contacts from person (relational — has id, type, value, label, isPrimary)
    const existingContacts: ContactInput[] = Array.isArray((person as any)?.contacts)
        ? (person as any).contacts.map((c: any) => ({
            type: c.type as 'phone' | 'email' | 'whatsapp',
            value: c.value,
            label: c.label || '',
            isPrimary: c.isPrimary,
        }))
        : []
    // Parse existing tags from PersonTag relation
    const existingTags: string[] = Array.isArray((person as any)?.tags)
        ? (person as any).tags.map((pt: any) => pt.tag?.name ?? pt.name ?? pt).filter(Boolean)
        : []

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: person.name || "",
            source: (person.source as string) || "",
            contacts: existingContacts.length > 0
                ? existingContacts.map(c => ({ ...c, label: c.label || "" }))
                : [{ type: "phone" as const, value: "", label: "", isPrimary: true }],
            tags: existingTags,
            priceLabelIds: (person as any)?.priceLabels?.map((pl: any) => pl.priceLabelId) || [],
            currencyIds: (person as any)?.personCurrencies?.map((pc: any) => pc.currencyId) || [],
            groupName: (person as any)?.groupName || "",
            groupNumber: (person as any)?.groupNumber || "",
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "contacts",
    })

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        try {
            // Tags are now an array directly
            const parsedTags = Array.isArray(values.tags) && values.tags.length > 0 ? values.tags : null

            // Clean contacts
            const cleanContacts: ContactInput[] = (values.contacts || [])
                .filter(c => c.value.trim() !== "")
                .map(c => ({
                    type: c.type,
                    value: c.value.trim(),
                    label: c.label || "",
                    isPrimary: c.isPrimary ?? false,
                }))

            const dataToSubmit = {
                name: values.name,
                source: (values.source || null) as 'bot' | 'manual' | 'import' | 'api' | null,
                contacts: cleanContacts.length > 0 ? cleanContacts : null,
                tags: parsedTags && parsedTags.length > 0 ? parsedTags : null,
                priceLabelIds: values.priceLabelIds || null,
                currencyIds: values.currencyIds && values.currencyIds.length > 0 ? values.currencyIds : null,
                groupName: values.groupName || null,
                groupNumber: values.groupNumber || null,
            }

            const res = await updatePerson(person.id, dataToSubmit)

            if (res.success) {
                toast.success('تم تحديث الشخص', {
                    description: `تم تحديث بيانات "${values.name}" بنجاح`
                })
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error('فشل الحفظ', {
                    description: res.error || 'حدث خطأ أثناء حفظ البيانات',
                    duration: 6000,
                })
            }
        } catch (error) {
            toast.error('خطأ غير متوقع', { description: 'تعذّر الاتصال بالخادم' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* === المعلومات الأساسية === */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b pb-2">
                        <User className="h-4 w-4 text-primary" />
                        المعلومات الأساسية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        الاسم الكامل <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: محمد أحمد" {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        <Globe className="h-3 w-3" />
                                        مصدر الشخص
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="اختر المصدر" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="bot">بوت / واتساب</SelectItem>
                                            <SelectItem value="manual">إدخال يدوي</SelectItem>
                                            <SelectItem value="import">استيراد</SelectItem>
                                            <SelectItem value="api">API</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="priceLabelIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        <Wallet className="h-3 w-3" />
                                        تسعيرات العميل
                                    </FormLabel>
                                    <FormControl>
                                        <MultiSelect
                                            options={priceLabels}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="اختر تسعيرة أو أكثر"
                                            emptyMessage="لا توجد تسعيرات مضافة"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="currencyIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        <Coins className="h-3 w-3" />
                                        عملات التعامل
                                    </FormLabel>
                                    <FormControl>
                                        <MultiSelect
                                            options={currencyOptions}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="اختر عملة أو أكثر"
                                            emptyMessage="لا توجد عملات مضافة"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="groupName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        <UsersRound className="h-3 w-3" />
                                        اسم المجموعة
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: كبار الشخصيات" {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="groupNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        رقم المجموعة
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: G-100" {...field} className="h-9 font-mono" dir="ltr" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* === معلومات الاتصال === */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            معلومات الاتصال
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => append({ type: "phone", value: "", label: "", isPrimary: false })}
                        >
                            <Plus className="h-3 w-3" />
                            إضافة
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {fields.map((field, index) => {
                            const contactType = form.watch(`contacts.${index}.type`)
                            const typeInfo = contactTypeLabels[contactType] || contactTypeLabels.phone
                            const TypeIcon = typeInfo.icon

                            return (
                                <div key={field.id} className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30">
                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FormField
                                                control={form.control}
                                                name={`contacts.${index}.type`}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-8 w-[110px] text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="phone">📞 هاتف</SelectItem>
                                                            <SelectItem value="email">📧 بريد</SelectItem>
                                                            <SelectItem value="whatsapp">💬 واتساب</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`contacts.${index}.value`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                placeholder={typeInfo.placeholder}
                                                                {...field}
                                                                className="h-8 text-sm font-mono"
                                                                dir="ltr"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FormField
                                                control={form.control}
                                                name={`contacts.${index}.label`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                placeholder="التسمية (شخصي، عمل...)"
                                                                {...field}
                                                                value={field.value ?? ""}
                                                                className="h-7 text-xs"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={form.watch(`contacts.${index}.isPrimary`)}
                                                    onChange={(e) => form.setValue(`contacts.${index}.isPrimary`, e.target.checked)}
                                                    className="rounded"
                                                />
                                                أساسي
                                            </label>
                                        </div>
                                    </div>
                                    {fields.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0 mt-0.5"
                                            onClick={() => remove(index)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* === الوسوم === */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b pb-2">
                        <Tag className="h-4 w-4 text-primary" />
                        الوسوم
                    </h3>

                    <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <TagInput
                                        value={Array.isArray(field.value) ? field.value : []}
                                        onChange={field.onChange}
                                        placeholder="أضف وسماً واضغط Enter..."
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="pt-6 border-t mt-4 flex flex-col-reverse md:flex-row items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSuccess?.()}
                        disabled={isSubmitting}
                        className="w-full md:w-auto rounded-xl h-11 px-6 text-base font-medium transition-all"
                    >
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        className="w-full md:w-auto rounded-xl h-11 px-8 text-base font-medium transition-all shadow-md shadow-primary/20"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            "حفظ التعديلات"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
});
