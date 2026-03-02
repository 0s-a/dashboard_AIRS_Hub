"use client"

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
import { createPerson, updatePerson } from "@/lib/actions/persons"
import { getPersonTypes } from "@/lib/actions/person-types"
import { ContactItem } from "@/lib/person-types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Person } from "@prisma/client"
import { User, Phone, Mail, MapPin, FileText, Loader2, Users, Tag, Plus, X, MessageCircle, Globe } from "lucide-react"
import { useState, useEffect } from "react"

const contactSchema = z.object({
    type: z.enum(["phone", "email", "whatsapp"]),
    value: z.string().min(1, "القيمة مطلوبة"),
    label: z.string(),
    isPrimary: z.boolean(),
})

const formSchema = z.object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    address: z.string().optional(),
    notes: z.string().optional(),
    personTypeId: z.string().optional(),
    type: z.string().optional(), // backward compatibility
    source: z.string().optional(),
    contacts: z.array(contactSchema),
    tags: z.string().optional(), // comma-separated, parsed on submit
})

type FormValues = z.infer<typeof formSchema>

interface PersonFormProps {
    person?: Person
    onSuccess?: () => void
}

const contactTypeLabels: Record<string, { label: string; icon: any; placeholder: string }> = {
    phone: { label: "هاتف", icon: Phone, placeholder: "0501234567" },
    email: { label: "بريد إلكتروني", icon: Mail, placeholder: "example@domain.com" },
    whatsapp: { label: "واتساب", icon: MessageCircle, placeholder: "0501234567" },
}

export function PersonForm({ person, onSuccess }: PersonFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [personTypes, setPersonTypes] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        getPersonTypes().then((res) => {
            if (res.success && res.data) {
                setPersonTypes(res.data)
            }
        })
    }, [])

    // Parse existing contacts from person
    const existingContacts = (person?.contacts as ContactItem[] | null) || []
    const existingTags = (person?.tags as string[] | null) || []

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: person?.name || "",
            address: person?.address || "",
            notes: person?.notes || "",
            personTypeId: person?.personTypeId || "",
            type: person?.type || "عادي",
            source: person?.source || "",
            contacts: existingContacts.length > 0
                ? existingContacts.map(c => ({ ...c, label: c.label || "" }))
                : [{ type: "phone" as const, value: "", label: "", isPrimary: true }],
            tags: existingTags.join("، "),
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "contacts",
    })

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        try {
            // Parse tags from comma-separated string
            const parsedTags = values.tags
                ? values.tags.split(/[,،]/).map(t => t.trim()).filter(Boolean)
                : null

            // Clean contacts
            const cleanContacts: ContactItem[] = (values.contacts || [])
                .filter(c => c.value.trim() !== "")
                .map(c => ({
                    type: c.type,
                    value: c.value.trim(),
                    label: c.label || "",
                    isPrimary: c.isPrimary,
                }))

            const dataToSubmit = {
                name: values.name,
                address: values.address || null,
                notes: values.notes || null,
                personTypeId: values.personTypeId || null,
                type: values.type || "عادي",
                source: values.source || null,
                contacts: cleanContacts.length > 0 ? cleanContacts : null,
                tags: parsedTags && parsedTags.length > 0 ? parsedTags : null,
            }

            let res;
            if (person) {
                res = await updatePerson(person.id, dataToSubmit)
            } else {
                res = await createPerson(dataToSubmit)
            }

            if (res.success) {
                toast.success(person ? 'تم تحديث الشخص' : 'تم إضافة الشخص', {
                    description: person
                        ? `تم تحديث بيانات "${values.name}" بنجاح`
                        : `تم إضافة الشخص "${values.name}" إلى القائمة`
                })
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error('فشل العملية', { description: res.error || 'حدث خطأ أثناء حفظ البيانات' })
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

                        <FormField
                            control={form.control}
                            name="personTypeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        نوع الشخص
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="اختر نوع الشخص" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {personTypes.length === 0 ? (
                                                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                                                    لا توجد أنواع. أضف من صفحة أنواع الأشخاص.
                                                </div>
                                            ) : (
                                                personTypes.map((pt) => (
                                                    <SelectItem key={pt.id} value={pt.id}>
                                                        {pt.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="اختر المصدر" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="موقع">موقع إلكتروني</SelectItem>
                                            <SelectItem value="إعلان">إعلان</SelectItem>
                                            <SelectItem value="توصية">توصية</SelectItem>
                                            <SelectItem value="معرض">معرض</SelectItem>
                                            <SelectItem value="أخرى">أخرى</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                {/* === العنوان والملاحظات === */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b pb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        تفاصيل إضافية
                    </h3>

                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    العنوان
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="المدينة، الحي..." {...field} className="h-9" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    <Tag className="h-3 w-3" />
                                    الوسوم (مفصولة بفاصلة)
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="مثال: مهم، دائم، جملة" {...field} className="h-9" />
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
                                <FormLabel className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    <FileText className="h-3 w-3" />
                                    ملاحظات إضافية
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="أي تفاصيل إضافية عن الشخص..."
                                        className="resize-none min-h-[70px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full h-11 text-base font-medium transition-all" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            جاري الحفظ...
                        </>
                    ) : (
                        person ? "حفظ التعديلات" : "إضافة شخص جديد"
                    )}
                </Button>
            </form>
        </Form>
    )
}
