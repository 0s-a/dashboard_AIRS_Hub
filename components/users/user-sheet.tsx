"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, Loader2, Save, UserPlus } from "lucide-react"
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
import { createUser, updateUser } from "@/lib/actions/users"
import { toast } from "sonner"
import { UserAvatar } from "./user-avatar"
import type { UserRow } from "./user-columns"

interface UserSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: UserRow
}

interface FormValues {
    name: string
    username: string
    password: string
    role: string
    color: string
}

const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#0ea5e9", "#64748b",
]

export function UserSheet({ open, onOpenChange, user }: UserSheetProps) {
    const isEditing = !!user
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: { name: "", username: "", password: "", role: "user", color: "#6366f1" },
    })

    const watchedColor = watch("color")
    const watchedName  = watch("name")

    useEffect(() => {
        if (open) {
            if (user) {
                reset({ name: user.name, username: user.username, password: "", role: user.role, color: user.color })
            } else {
                reset({ name: "", username: "", password: "", role: "user", color: "#6366f1" })
            }
            setShowPassword(false)
        }
    }, [open, user, reset])

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            if (isEditing) {
                const updateData: Record<string, string> = {
                    name:  data.name,
                    username: data.username,
                    role:  data.role,
                    color: data.color,
                }
                if (data.password.trim()) updateData.password = data.password
                const res = await updateUser(user!.id, updateData)
                if (res.success) { toast.success("تم تحديث المستخدم بنجاح"); onOpenChange(false) }
                else toast.error(res.error)
            } else {
                if (!data.password.trim()) { toast.error("كلمة المرور مطلوبة للمستخدم الجديد"); setIsLoading(false); return }
                const res = await createUser(data)
                if (res.success) { toast.success("تم إنشاء المستخدم بنجاح"); onOpenChange(false) }
                else toast.error(res.error)
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
