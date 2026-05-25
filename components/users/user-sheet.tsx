"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, Loader2, Save, UserPlus, Phone, Mail, MessageCircle, Plus, X } from "lucide-react"
import { contactSchema } from "@/lib/validations/person"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createUser, updateUser, replaceUserContacts } from "@/lib/actions/users"
import { toast } from "sonner"
import { UserAvatar } from "./user-avatar"
import type { UserRow } from "./user-columns"

interface UserSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: UserRow
    onSaved?: (updated: UserRow[]) => void
}

const contactTypeLabels: Record<string, { label: string; placeholder: string }> = {
    phone:    { label: '📞 هاتف',           placeholder: '0501234567' },
    email:    { label: '📧 بريد إلكتروني',  placeholder: 'example@domain.com' },
    whatsapp: { label: '💬 واتساب',         placeholder: '0501234567' },
}

const userSheetSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    username: z.string().min(1, 'اسم المستخدم مطلوب'),
    password: z.string(),
    role: z.string(),
    color: z.string(),
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
})

type FormValues = z.input<typeof userSheetSchema>

const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#0ea5e9", "#64748b",
]

export function UserSheet({ open, onOpenChange, user, onSaved }: UserSheetProps) {
    const isEditing = !!user
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(userSheetSchema),
        defaultValues: {
            name: "", username: "", password: "", role: "user", color: "#6366f1",
            contacts: [{ type: "phone", value: "", label: "", isPrimary: true }],
        },
    })

    const { fields, append, remove } = useFieldArray({ control, name: "contacts" })

    const watchedColor = watch("color")
    const watchedName  = watch("name")

    useEffect(() => {
        if (open) {
            if (user) {
                reset({
                    name: user.name,
                    username: user.username,
                    password: "",
                    role: user.role,
                    color: user.color,
                    contacts: user.contacts?.length
                        ? user.contacts.map(c => ({ type: c.type as any, value: c.value, label: c.label || "", isPrimary: c.isPrimary }))
                        : [{ type: "phone", value: "", label: "", isPrimary: true }],
                })
            } else {
                reset({
                    name: "", username: "", password: "", role: "user", color: "#6366f1",
                    contacts: [{ type: "phone", value: "", label: "", isPrimary: true }],
                })
            }
            setShowPassword(false)
        }
    }, [open, user, reset])

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const cleanContacts = (data.contacts || [])
                .filter(c => c.value.trim() !== "")
                .map(c => ({ type: c.type, value: c.value.trim(), label: c.label || undefined, isPrimary: c.isPrimary ?? false }))

            if (isEditing) {
                const updateData: Record<string, string> = {
                    name:     data.name,
                    username: data.username,
                    role:     data.role,
                    color:    data.color,
                }
                if (data.password.trim()) updateData.password = data.password
                const [res, contactRes] = await Promise.all([
                    updateUser(user!.id, updateData),
                    replaceUserContacts(user!.id, cleanContacts),
                ])
                if (res.success && contactRes.success) {
                    toast.success("تم تحديث المستخدم بنجاح")
                    onOpenChange(false)
                } else {
                    toast.error((res as any).error || contactRes.error || 'حدث خطأ أثناء الحفظ', { duration: 6000 })
                }
            } else {
                if (!data.password.trim()) { toast.error("كلمة المرور مطلوبة للمستخدم الجديد"); setIsLoading(false); return }
                const res = await createUser(data)
                if (res.success) {
                    // بعد إنشاء المستخدم نجلب الـ ID من النتيجة ونحفظ الاتصالات
                    if (cleanContacts.length > 0 && (res.data as any)?.id) {
                        await replaceUserContacts((res.data as any).id, cleanContacts)
                    }
                    toast.success("تم إنشاء المستخدم بنجاح")
                    onOpenChange(false)
                } else {
                    toast.error(res.error)
                }
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
                    <SheetTitle className="text-xl font-bold">
                        {isEditing ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                    </SheetTitle>
                    <SheetDescription>
                        {isEditing ? "عدّل بيانات المستخدم. اترك كلمة المرور فارغة للإبقاء عليها" : "أدخل بيانات المستخدم الجديد"}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-1">

                    {/* Avatar preview */}
                    <div className="flex items-center gap-4 py-2">
                        <UserAvatar name={watchedName || "؟"} color={watchedColor} size="lg" />
                        <div>
                            <p className="text-sm font-semibold text-foreground/70 mb-2">لون الحساب</p>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setValue("color", c)}
                                        className="size-6 rounded-full transition-transform hover:scale-110"
                                        style={{
                                            backgroundColor: c,
                                            outline: watchedColor === c ? `2px solid ${c}` : "none",
                                            outlineOffset: "2px",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold">
                            الاسم الكامل <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name" placeholder="مثال: أحمد محمد"
                            className="h-10 rounded-xl"
                            {...register("name", { required: "الاسم مطلوب" })}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-semibold">
                            اسم المستخدم <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="username" placeholder="مثال: ahmed"
                            className="h-10 rounded-xl font-mono text-left" dir="ltr"
                            {...register("username", { required: "اسم المستخدم مطلوب" })}
                        />
                        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">الدور</Label>
                        <Select defaultValue={user?.role ?? "user"} onValueChange={v => setValue("role", v)}>
                            <SelectTrigger className="h-10 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">مستخدم عادي</SelectItem>
                                <SelectItem value="admin">مدير النظام</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold">
                            كلمة المرور {!isEditing && <span className="text-destructive">*</span>}
                            {isEditing && <span className="text-muted-foreground text-xs font-normal"> (اتركها فارغة للإبقاء)</span>}
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={isEditing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
                                className="h-10 rounded-xl pe-10"
                                {...register("password", {
                                    required: !isEditing ? "كلمة المرور مطلوبة" : false,
                                    minLength: isEditing ? undefined : { value: 4, message: "4 أحرف على الأقل" },
                                })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                    </div>

                    {/* معلومات الاتصال */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                معلومات الاتصال
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
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
                                                {/* نوع الاتصال */}
                                                <Select
                                                    value={contactType}
                                                    onValueChange={(v) => setValue(`contacts.${index}.type`, v as any)}
                                                >
                                                    <SelectTrigger className="h-8 w-[120px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(contactTypeLabels).map(([k, v]) => (
                                                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {/* القيمة */}
                                                <Input
                                                    placeholder={typeInfo.placeholder}
                                                    className="h-8 text-sm font-mono flex-1"
                                                    dir="ltr"
                                                    {...register(`contacts.${index}.value`)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* التسمية */}
                                                <Input
                                                    placeholder="التسمية (شخصي، عمل...)"
                                                    className="h-7 text-xs flex-1"
                                                    {...register(`contacts.${index}.label`)}
                                                />
                                                {/* أساسي */}
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

                    {/* Submit */}
                    <Button type="submit" disabled={isLoading} className="w-full h-10 rounded-xl font-bold gap-2">
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : isEditing ? <Save className="size-4" /> : <UserPlus className="size-4" />}
                        {isLoading ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إنشاء المستخدم"}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    )
}
