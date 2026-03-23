"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Save, Loader2, KeyRound, User, ShieldCheck, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/users/user-avatar"
import { updateProfile, changePassword } from "@/lib/actions/profile"
import { getCurrentUser } from "@/lib/actions/auth"
import { getUsers } from "@/lib/actions/users"
import { toast } from "sonner"

const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#0ea5e9", "#64748b",
]

function formatDate(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

export default function ProfilePage() {
    const [userData, setUserData] = useState<{
        userId: string; name: string; username: string; role: string; color: string
        lastLogin?: Date | string | null; createdAt?: Date | string
    } | null>(null)
    const [selectedColor, setSelectedColor] = useState("#6366f1")
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)

    // Profile form
    const { register: regProfile, handleSubmit: handleProfile, reset: resetProfile,
        formState: { errors: profileErrors } } = useForm<{ name: string }>()

    // Password form
    const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd,
        formState: { errors: pwdErrors }, watch: watchPwd } = useForm<{
            current: string; newPwd: string; confirm: string
        }>()
    const newPwd = watchPwd("newPwd")

    useEffect(() => {
        const load = async () => {
            const [me, usersRes] = await Promise.all([getCurrentUser(), getUsers()])
            if (!me.success || !me.data) return
            // Get createdAt and lastLogin from the users list
            const full = usersRes.success && usersRes.data
                ? (usersRes.data as any[]).find((u: any) => u.id === me.data!.userId)
                : null
            setUserData({
                ...me.data,
                lastLogin: full?.lastLogin ?? null,
                createdAt: full?.createdAt ?? null,
            })
            setSelectedColor(me.data.color)
            resetProfile({ name: me.data.name })
        }
        load()
    }, [resetProfile])

    const onProfileSave = async (data: { name: string }) => {
        setSavingProfile(true)
        const res = await updateProfile({ name: data.name, color: selectedColor })
        if (res.success) {
            toast.success("تم تحديث الملف الشخصي")
            setUserData(prev => prev ? { ...prev, name: data.name, color: selectedColor } : prev)
        } else {
            toast.error(res.error)
        }
        setSavingProfile(false)
    }

    const onPasswordSave = async (data: { current: string; newPwd: string; confirm: string }) => {
        if (data.newPwd !== data.confirm) { toast.error("كلمة المرور الجديدة لا تتطابق"); return }
        setSavingPassword(true)
        const res = await changePassword(data.current, data.newPwd)
        if (res.success) {
            toast.success("تم تغيير كلمة المرور بنجاح")
            resetPwd()
        } else {
            toast.error(res.error)
        }
        setSavingPassword(false)
    }

    if (!userData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                    الملف الشخصي
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    تعديل بياناتك واعدادات الحساب
                </p>
            </div>

            {/* Profile card */}
            <div className="glass-panel rounded-2xl border border-border/50 p-8 space-y-6">

                {/* Avatar + info */}
                <div className="flex items-center gap-5">
                    <UserAvatar name={userData.name} color={selectedColor} size="xl" />
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black">{userData.name}</h2>
                            {userData.role === "admin" ? (
                                <Badge className="bg-primary/10 text-primary border-0 gap-1">
                                    <ShieldCheck className="size-3" /> مدير
                                </Badge>
                            ) : (
                                <Badge className="bg-muted text-muted-foreground border-0 gap-1">
                                    <User className="size-3" /> مستخدم
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">@{userData.username}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground/70 pt-1">
                            <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {formatDate(userData.createdAt as string)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                آخر دخول: {formatDate(userData.lastLogin as string)}
                            </span>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Profile form */}
                <form onSubmit={handleProfile(onProfileSave)} className="space-y-5">
                    <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest">المعلومات الأساسية</h3>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">الاسم الكامل</Label>
                        <Input
                            className="h-11 rounded-xl"
                            placeholder="الاسم الكامل"
                            {...regProfile("name", { required: "الاسم مطلوب" })}
                        />
                        {profileErrors.name && (
                            <p className="text-xs text-destructive">{profileErrors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">لون الحساب</Label>
                        <div className="flex items-center gap-3">
                            <UserAvatar name={userData.name} color={selectedColor} size="sm" />
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setSelectedColor(c)}
                                        className="size-7 rounded-full transition-transform hover:scale-110"
                                        style={{
                                            backgroundColor: c,
                                            outline: selectedColor === c ? `2px solid ${c}` : "none",
                                            outlineOffset: "3px",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button type="submit" disabled={savingProfile} className="gap-2 rounded-xl">
                        {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        حفظ التغييرات
                    </Button>
                </form>

                <Separator />

                {/* Password form */}
                <form onSubmit={handlePwd(onPasswordSave)} className="space-y-5">
                    <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest flex items-center gap-2">
                        <KeyRound className="size-4" />
                        تغيير كلمة المرور
                    </h3>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">كلمة المرور الحالية</Label>
                        <Input
                            type="password" className="h-11 rounded-xl"
                            placeholder="••••••••"
                            {...regPwd("current", { required: "مطلوب" })}
                        />
                        {pwdErrors.current && <p className="text-xs text-destructive">{pwdErrors.current.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">كلمة المرور الجديدة</Label>
                            <Input
                                type="password" className="h-11 rounded-xl"
                                placeholder="••••••••"
                                {...regPwd("newPwd", { required: "مطلوب", minLength: { value: 4, message: "4 أحرف على الأقل" } })}
                            />
                            {pwdErrors.newPwd && <p className="text-xs text-destructive">{pwdErrors.newPwd.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">تأكيد كلمة المرور</Label>
                            <Input
                                type="password" className="h-11 rounded-xl"
                                placeholder="••••••••"
                                {...regPwd("confirm", {
                                    required: "مطلوب",
                                    validate: v => v === newPwd || "كلمة المرور لا تتطابق"
                                })}
                            />
                            {pwdErrors.confirm && <p className="text-xs text-destructive">{pwdErrors.confirm.message}</p>}
                        </div>
                    </div>

                    <Button type="submit" disabled={savingPassword} variant="outline" className="gap-2 rounded-xl">
                        {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                        تغيير كلمة المرور
                    </Button>
                </form>
            </div>
        </div>
    )
}
