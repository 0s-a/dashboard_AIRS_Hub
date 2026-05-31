"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Save, ShieldAlert, Plus, X, Phone } from "lucide-react"
import { contactSchema } from "@/lib/validations/customer"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { createSupervisor, updateSupervisor } from "@/lib/actions/supervisors"
import { toast } from "sonner"
import type { SupervisorRow } from "./supervisor-columns"

interface SupervisorSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    supervisor?: SupervisorRow
    onSaved?: (updated: SupervisorRow[]) => void
}

const contactTypeLabels: Record<string, { label: string; placeholder: string }> = {
    phone:    { label: '📞 هاتف',           placeholder: '0501234567' },
    email:    { label: '📧 بريد إلكتروني',  placeholder: 'example@domain.com' },
    whatsapp: { label: '💬 واتساب',         placeholder: '0501234567' },
}

const supervisorSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    notes: z.string().optional(),
    contacts: z.array(contactSchema).superRefine((contacts, ctx) => {
        const seen = new Map<string, number>()
        contacts.forEach((c, i) => {
            const key = `${c.type}:${c.value.trim()}`
            if (seen.has(key)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'value'], message: 'هذا الرقم/البريد مكرر' })
            } else { seen.set(key, i) }
        })
    }),
})

type FormValues = z.input<typeof supervisorSchema>

export function SupervisorSheet({ open, onOpenChange, supervisor, onSaved }: SupervisorSheetProps) {
    const isEditing = !!supervisor
    const [isLoading, setIsLoading] = useState(false)

    const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(supervisorSchema),
        defaultValues: {
            name: "", notes: "",
            contacts: [{ type: "phone", value: "", label: "", isPrimary: true }],
        },
    })

    const { fields, append, remove } = useFieldArray({ control, name: "contacts" })

    useEffect(() => {
        if (open) {
            if (supervisor) {
                reset({
                    name: supervisor.name,
                    notes: supervisor.notes || "",
                    contacts: supervisor.contacts?.length
                        ? supervisor.contacts.map(c => ({ type: c.type as any, value: c.value, label: c.label || "", isPrimary: c.isPrimary }))
                        : [{ type: "phone", value: "", label: "", isPrimary: true }],
                })
            } else {
                reset({ name: "", notes: "", contacts: [{ type: "phone", value: "", label: "", isPrimary: true }] })
            }
        }
    }, [open, supervisor, reset])

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const cleanContacts = (data.contacts || [])
                .filter(c => c.value.trim())
                .map(c => ({ type: c.type as any, value: c.value.trim(), label: c.label || undefined, isPrimary: c.isPrimary ?? false }))

            const payload = {
                name: data.name.trim(),
                notes: data.notes?.trim() || undefined,
                contacts: cleanContacts,
            }

            const res = isEditing
                ? await updateSupervisor(supervisor!.id, payload)
                : await createSupervisor(payload)

            if (res.success) {
                toast.success(isEditing ? "تم تحديث المشرف بنجاح" : "تم إنشاء المشرف بنجاح")
                onOpenChange(false)
            } else {
                toast.error((res as any).error || 'حدث خطأ أثناء الحفظ', { duration: 6000 })
            }
        } catch {
            toast.error("حدث خطأ غير متوقع")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <ShieldAlert className="size-5 text-violet-600" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold">
                                {isEditing ? "تعديل المشرف" : "إضافة مشرف جديد"}
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {isEditing ? "عدّل بيانات المشرف" : "أدخل بيانات المشرف الجديد"}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-1">

                    {/* الاسم */}
                    <div className="space-y-2">
                        <Label htmlFor="sup-name" className="text-sm font-semibold">
                            الاسم الكامل <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="sup-name" placeholder="مثال: محمد أحمد"
                            className="h-10 rounded-xl"
                            {...register("name")}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* الملاحظات */}
                    <div className="space-y-2">
                        <Label htmlFor="sup-notes" className="text-sm font-semibold">ملاحظات</Label>
                        <Textarea
                            id="sup-notes"
                            placeholder="ملاحظات إضافية عن المشرف..."
                            className="rounded-xl resize-none min-h-[80px]"
                            {...register("notes")}
                        />
                    </div>

                    {/* معلومات الاتصال */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                معلومات الاتصال
                            </Label>
                            <Button
                                type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => append({ type: "phone", value: "", label: "", isPrimary: false })}
                            >
                                <Plus className="h-3 w-3" /> إضافة
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {fields.map((field, index) => {
                                const contactType = watch(`contacts.${index}.type`)
                                const typeInfo = contactTypeLabels[contactType] || contactTypeLabels.phone
                                return (
                                    <div key={field.id} className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30">
                                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={contactType}
                                                    onValueChange={(v) => setValue(`contacts.${index}.type`, v as any)}
                                                >
                                                    <SelectTrigger className="h-8 w-[130px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(contactTypeLabels).map(([k, v]) => (
                                                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    placeholder={typeInfo.placeholder}
                                                    className="h-8 text-sm font-mono flex-1"
                                                    dir="ltr"
                                                    {...register(`contacts.${index}.value`)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="التسمية (شخصي، عمل...)"
                                                    className="h-7 text-xs flex-1"
                                                    {...register(`contacts.${index}.label`)}
                                                />
                                                <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={watch(`contacts.${index}.isPrimary`)}
                                                        onChange={(e) => setValue(`contacts.${index}.isPrimary`, e.target.checked)}
                                                        className="rounded"
                                                    />
                                                    أساسي
                                                </label>
                                            </div>
                                            {errors.contacts?.[index]?.value && (
                                                <p className="text-xs text-destructive">{errors.contacts[index]?.value?.message}</p>
                                            )}
                                        </div>
                                        {fields.length > 1 && (
                                            <Button
                                                type="button" variant="ghost" size="icon"
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

                    {/* حفظ */}
                    <Button type="submit" disabled={isLoading} className="w-full h-10 rounded-xl font-bold gap-2">
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        {isLoading ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إنشاء المشرف"}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    )
}
