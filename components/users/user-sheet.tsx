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
import { createUser, updateUser } from "@/lib/actions/users"
import { toast } from "sonner"
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
}

export function UserSheet({ open, onOpenChange, user }: UserSheetProps) {
    const isEditing = !!user
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            name: "",
            username: "",
            password: "",
        },
    })

    useEffect(() => {
        if (open) {
            if (user) {
                reset({
                    name: user.name,
                    username: user.username,
                    password: "",
                })
            } else {
                reset({ name: "", username: "", password: "" })
            }
            setShowPassword(false)
        }
    }, [open, user, reset])

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            if (isEditing) {
                const updateData: any = {
                    name: data.name,
                    username: data.username,
                }
                if (data.password.trim()) {
                    updateData.password = data.password
                }
                const res = await updateUser(user!.id, updateData)
                if (res.success) {
                    toast.success("تم تحديث المستخدم بنجاح")
                    onOpenChange(false)
                } else {
                    toast.error(res.error)
                }
            } else {
                if (!data.password.trim()) {
                    toast.error("كلمة المرور مطلوبة للمستخدم الجديد")
                    setIsLoading(false)
                    return
                }
                const res = await createUser(data)
                if (res.success) {
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
                <SheetHeader className="pb-6">
                    <SheetTitle className="text-xl font-bold">
                        {isEditing ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                    </SheetTitle>
                    <SheetDescription>
                        {isEditing
                            ? "عدّل بيانات المستخدم. اترك كلمة المرور فارغة للإبقاء عليها"
                            : "أدخل بيانات المستخدم الجديد"
                        }
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-1">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold">
                            الاسم الكامل <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            placeholder="مثال: أحمد محمد"
                            className="h-10 rounded-xl"
                            {...register("name", { required: "الاسم مطلوب" })}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-semibold">
                            اسم المستخدم <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="username"
                            placeholder="مثال: ahmed"
                            className="h-10 rounded-xl font-mono text-left"
                            dir="ltr"
                            {...register("username", { required: "اسم المستخدم مطلوب" })}
                        />
                        {errors.username && (
                            <p className="text-xs text-destructive">{errors.username.message}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold">
                            كلمة المرور {!isEditing && <span className="text-destructive">*</span>}
                            {isEditing && <span className="text-muted-foreground text-xs font-normal">(اتركها فارغة للإبقاء)</span>}
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
                        {errors.password && (
                            <p className="text-xs text-destructive">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-10 rounded-xl font-bold gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEditing ? (
                            <Save className="size-4" />
                        ) : (
                            <UserPlus className="size-4" />
                        )}
                        {isLoading
                            ? "جاري الحفظ..."
                            : isEditing
                                ? "حفظ التعديلات"
                                : "إنشاء المستخدم"
                        }
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    )
}
