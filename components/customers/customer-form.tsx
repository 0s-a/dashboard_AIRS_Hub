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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updateCustomer, createCustomer } from "@/lib/actions/customers"
import { getPriceLabels } from "@/lib/actions/price-labels"
import { getActiveCurrencies } from "@/lib/actions/currencies"
import { contactsArraySchema, type ContactInput } from "@/lib/validations/customer"
import {
    CONTACT_TYPE_OPTIONS,
    getContactTypeConfig,
} from "@/lib/config/contact.config"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Customer } from "@prisma/client"
import { User, Phone, Mail, Loader2, Tag, Plus, X, MessageCircle, Globe, Wallet, Coins, Star, Trash2, StickyNote } from "lucide-react"
import { useState, useEffect } from "react"
import { MultiSelect, OptionType } from "@/components/ui/multi-select"
import { TagInput } from "@/components/ui/tag-input"

const CONTACT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Phone,
    Mail,
    MessageCircle,
}

const formSchema = z.object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    type: z.enum(["customer", "supervisor"]),
    notes: z.string().optional(),
    source: z.string().optional(),
    contacts: contactsArraySchema,
    tags: z.array(z.string()).optional(),
    priceLabelId: z.string().nullable().optional(),
    currencyIds: z.array(z.string()).optional(),
})

type FormValues = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

interface CustomerFormProps {
    customer?: Customer   // اختياري — غائب = إنشاء، موجود = تعديل
    onSuccess?: () => void
}

export const CustomerForm = React.memo(function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
    const router = useRouter()
    const isEditMode = !!customer
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [priceLabelOptions, setPriceLabelOptions] = useState<{ id: string; name: string; customerType: string | null }[]>([])
    const [currencyOptions, setCurrencyOptions] = useState<OptionType[]>([])

    useEffect(() => {
        const fetchAll = async () => {
            const [priceLabelsRes, currenciesRes] = await Promise.all([
                getPriceLabels(),
                getActiveCurrencies(),
            ])
            if (priceLabelsRes.success && priceLabelsRes.data) {
                setPriceLabelOptions(priceLabelsRes.data.map((l: any) => ({
                    id: l.id,
                    name: l.name,
                    customerType: l.customerType ?? null,
                })))
            }
            if (currenciesRes.success && currenciesRes.data) {
                setCurrencyOptions(currenciesRes.data.map(c => ({ label: `${c.symbol} — ${c.name}`, value: c.id })))
            }
        }
        fetchAll()
    }, [])

    // Parse existing contacts (only in Edit Mode)
    const existingContacts: ContactInput[] = isEditMode && Array.isArray((customer as any)?.contacts)
        ? (customer as any).contacts.map((c: any) => ({
            type: c.type as 'phone' | 'email' | 'whatsapp',
            value: c.value,
            label: c.label || '',
            isPrimary: c.isPrimary,
        }))
        : []

    // Parse existing tags (only in Edit Mode)
    const existingTags: string[] = isEditMode && Array.isArray((customer as any)?.tags)
        ? (customer as any).tags.map((pt: any) => pt.tag?.name ?? pt.name ?? pt).filter(Boolean)
        : []

    const form = useForm<FormValues, unknown, FormOutput>({
        resolver: zodResolver(formSchema),
        defaultValues: isEditMode
            ? {
                name: customer.name || "",
                type: (customer as any).type === "supervisor" ? "supervisor" : "customer",
                notes: (customer as any).notes || "",
                source: (customer.source as string) || "",
                contacts: existingContacts.length > 0
                    ? existingContacts.map(c => ({ ...c, label: c.label || "" }))
                    : [{ type: "phone" as const, value: "", label: "", isPrimary: true }],
                tags: existingTags,
                priceLabelId: (customer as any)?.priceLabelId || "",
                currencyIds: (customer as any)?.customerCurrencies?.map((pc: any) => pc.currencyId) || [],
            }
            : {
                name: "",
                type: "customer",
                notes: "",
                source: "",
                contacts: [{ type: "phone" as const, value: "", label: "", isPrimary: true }],
                tags: [],
                priceLabelId: "",
                currencyIds: [],
            },
    })

    const personType = form.watch("type")
    const isSupervisor = personType === "supervisor"

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "contacts",
    })

    async function onSubmit(values: FormOutput) {
        setIsSubmitting(true)
        try {
            const parsedTags = Array.isArray(values.tags) && values.tags.length > 0 ? values.tags : null

            const cleanContacts: ContactInput[] = (values.contacts || [])
                .filter(c => c.value.trim() !== "")
                .map(c => ({
                    type: c.type,
                    value: c.value.trim(),
                    label: c.label || "",
                    isPrimary: c.isPrimary ?? false,
                }))

            const payload = {
                name: values.name,
                type: values.type,
                notes: values.notes?.trim() || null,
                source: (values.source || null) as 'bot' | 'manual' | 'import' | 'api' | null,
                contacts: cleanContacts.length > 0 ? cleanContacts : null,
                tags: parsedTags && parsedTags.length > 0 ? parsedTags : null,
                priceLabelId: values.type === 'supervisor' ? null : (values.priceLabelId || null),
                currencyIds: values.type === 'supervisor'
                    ? []
                    : (values.currencyIds && values.currencyIds.length > 0 ? values.currencyIds : null),
            }

            const res = isEditMode
                ? await updateCustomer(customer.id, payload)
                : await createCustomer({ ...payload, name: values.name })

            if (res.success) {
                const label = values.type === 'supervisor' ? 'المشرف' : 'العميل'
                toast.success(isEditMode ? `تم تحديث ${label}` : `تم إضافة ${label}`, {
                    description: isEditMode
                        ? `تم تحديث بيانات "${values.name}" بنجاح`
                        : `تمت إضافة "${values.name}" بنجاح`
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* === المعلومات الأساسية === */}
                <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/5 p-4 md:p-5 shadow-xs transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    المعلومات الأساسية
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    الاسم والتصنيف والهوية العامة في النظام
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                                        الاسم الكامل <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                placeholder="مثال: محمد أحمد" 
                                                {...field} 
                                                className="h-10 rounded-xl pr-9 transition-all focus:ring-2 focus:ring-primary/20" 
                                            />
                                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                                            التصنيف <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-10 rounded-xl bg-background/50 hover:bg-background transition-colors">
                                                    <SelectValue placeholder="اختر التصنيف" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="customer">عميل</SelectItem>
                                                <SelectItem value="supervisor">مشرف</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                                            مصدر التسجيل
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger className="h-10 rounded-xl bg-background/50 hover:bg-background transition-colors">
                                                    <SelectValue placeholder="اختر المصدر" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="bot">بوت / واتساب</SelectItem>
                                                <SelectItem value="manual">إدخال يدوي</SelectItem>
                                                <SelectItem value="import">استيراد</SelectItem>
                                                <SelectItem value="api">API</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                                        <StickyNote className="h-3.5 w-3.5" />
                                        ملاحظات
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="ملاحظات اختيارية..."
                                            {...field}
                                            value={field.value || ""}
                                            className="min-h-[80px] rounded-xl resize-y"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {!isSupervisor && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priceLabelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                                            تسعيرة العميل
                                        </FormLabel>
                                        <Select
                                            onValueChange={v => field.onChange(v === 'none' ? null : v)}
                                            value={field.value || 'none'}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-10 rounded-xl bg-background/50 hover:bg-background transition-colors">
                                                    <SelectValue placeholder="اختر التسعيرة" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="none">
                                                    <span className="text-muted-foreground">— بدون تصنيف —</span>
                                                </SelectItem>
                                                {priceLabelOptions.map(opt => (
                                                    <SelectItem key={opt.id} value={opt.id}>
                                                        {opt.name}
                                                        {opt.customerType && (
                                                            <span className="text-muted-foreground"> — {opt.customerType}</span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>
                        )}

                        {!isSupervisor && (
                        <FormField
                            control={form.control}
                            name="currencyIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                                        عملات التعامل
                                    </FormLabel>
                                    <FormControl>
                                        <MultiSelect
                                            options={currencyOptions}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="اختر عملة أو أكثر"
                                            emptyMessage="لا توجد عملات مضافة"
                                            className="min-h-[40px] rounded-xl bg-background/50 hover:bg-background"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                        )}
                    </div>
                </div>

                {/* === معلومات الاتصال === */}
                <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/5 p-4 md:p-5 shadow-xs transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    بيانات الاتصال
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    أرقام الهواتف، البريد الإلكتروني، وعناوين المراسلة
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8.5 text-xs gap-1.5 rounded-xl bg-background hover:bg-muted border-border/60 transition-all font-medium"
                            onClick={() => append({ type: "phone", value: "", label: "", isPrimary: false })}
                        >
                            <Plus className="h-3.5 w-3.5 text-primary" />
                            إضافة جهة اتصال
                        </Button>
                    </div>

                    <div className="space-y-3.5">
                        {fields.map((field, index) => {
                            const contactType = form.watch(`contacts.${index}.type`)
                            const typeConfig = getContactTypeConfig(contactType)
                            const placeholder = typeConfig?.placeholder ?? '0501234567'
                            const TypeIcon = CONTACT_ICONS[typeConfig?.icon ?? 'Phone'] ?? Phone

                            return (
                                <div key={field.id} className="group/item relative overflow-hidden rounded-xl border border-border/80 bg-card p-3.5 shadow-xs hover:border-primary/30 hover:shadow-xs transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-2">
                                    {/* Colored side stripe depending on type */}
                                    <div className={`absolute top-0 bottom-0 right-0 w-1 ${
                                        contactType === 'whatsapp' ? 'bg-emerald-500' :
                                        contactType === 'email' ? 'bg-sky-500' : 'bg-indigo-500'
                                    }`} />
                                    
                                    <div className="space-y-3 pr-2.5">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <FormField
                                                control={form.control}
                                                name={`contacts.${index}.type`}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-10 w-full sm:w-[120px] text-xs rounded-xl border-border/60 bg-muted/40 hover:bg-muted/70 transition-colors font-medium">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {CONTACT_TYPE_OPTIONS.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
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
                                                            <div className="relative">
                                                                <Input
                                                                    placeholder={placeholder}
                                                                    {...field}
                                                                    className="h-10 text-sm font-mono rounded-xl transition-all pr-10 border-border/60 focus:ring-2 focus:ring-primary/10"
                                                                    dir="ltr"
                                                                />
                                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                                                                    <TypeIcon className={`h-4.5 w-4.5 ${
                                                                        contactType === 'whatsapp' ? 'text-emerald-500' :
                                                                        contactType === 'email' ? 'text-sky-500' : 'text-indigo-500'
                                                                    }`} />
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-[11px] mt-1" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/30">
                                            <FormField
                                                control={form.control}
                                                name={`contacts.${index}.label`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                placeholder="التسمية (مثال: شخصي، عمل، رئيسي...)"
                                                                {...field}
                                                                value={field.value ?? ""}
                                                                className="h-8.5 text-xs rounded-xl border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const isCurrentlyPrimary = form.getValues(`contacts.${index}.isPrimary`)
                                                        if (isCurrentlyPrimary) {
                                                            form.setValue(`contacts.${index}.isPrimary`, false)
                                                        } else {
                                                            const contacts = form.getValues('contacts') || []
                                                            contacts.forEach((_, i) => {
                                                                form.setValue(`contacts.${i}.isPrimary`, i === index)
                                                            })
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all duration-300 ${
                                                        form.watch(`contacts.${index}.isPrimary`)
                                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 shadow-xs'
                                                            : 'bg-muted/30 text-muted-foreground border-transparent hover:border-border/60 hover:bg-muted/80'
                                                    }`}
                                                >
                                                    <Star className={`h-3.5 w-3.5 transition-transform duration-300 ${
                                                        form.watch(`contacts.${index}.isPrimary`) 
                                                            ? 'fill-amber-500 text-amber-500 scale-110' 
                                                            : 'text-muted-foreground'
                                                    }`} />
                                                    <span>أساسي</span>
                                                </button>

                                                {fields.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* === الوسوم والتصنيف === */}
                <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/5 p-4 md:p-5 shadow-xs transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Tag className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    الوسوم والكلمات الدلالية
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    تصنيف العميل بوسوم محددة لتسهيل البحث والاستهداف
                                </p>
                            </div>
                        </div>
                    </div>

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
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* === أزرار الإجراءات === */}
                <div className="pt-6 border-t mt-5 flex flex-col-reverse md:flex-row items-center justify-end gap-3 bg-background/50 backdrop-blur-xs sticky bottom-0 z-10 py-4 -mx-1">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSuccess?.()}
                        disabled={isSubmitting}
                        className="w-full md:w-auto rounded-xl h-11 px-6 text-sm font-semibold transition-all hover:bg-muted border-border/80"
                    >
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        className="w-full md:w-auto rounded-xl h-11 px-8 text-sm font-semibold transition-all shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 text-white hover:opacity-95 border-0"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin animate-duration-1000" />
                                جاري الحفظ...
                            </>
                        ) : isEditMode ? (
                            "حفظ التعديلات"
                        ) : (
                            "إضافة العميل"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
});
