"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import Image from "next/image"
import {
    Store, Save, Loader2, Phone, Mail, MessageCircle, Globe, MapPin,
    Clock, Facebook, Instagram, Twitter, Share2, Building2, FileText,
    Upload, Trash2, ImageIcon, Camera
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getStoreSettings, updateStoreSettings, uploadStoreLogo, deleteStoreLogo } from "@/lib/actions/store-settings"

type StoreFormData = {
    name: string
    description: string
    phone: string
    email: string
    whatsapp: string
    website: string
    address: string
    city: string
    country: string
}

type SocialLinks = {
    facebook: string
    instagram: string
    twitter: string
    tiktok: string
}

const DAYS = [
    { key: "sat", label: "السبت" },
    { key: "sun", label: "الأحد" },
    { key: "mon", label: "الاثنين" },
    { key: "tue", label: "الثلاثاء" },
    { key: "wed", label: "الأربعاء" },
    { key: "thu", label: "الخميس" },
    { key: "fri", label: "الجمعة" },
]

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const logoInputRef = useRef<HTMLInputElement>(null)
    const [socialLinks, setSocialLinks] = useState<SocialLinks>({
        facebook: "", instagram: "", twitter: "", tiktok: ""
    })
    const [workingHours, setWorkingHours] = useState<Record<string, { from: string; to: string; closed: boolean }>>(() => {
        const defaults: Record<string, { from: string; to: string; closed: boolean }> = {}
        DAYS.forEach(d => {
            defaults[d.key] = { from: "08:00", to: "17:00", closed: d.key === "fri" }
        })
        return defaults
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<StoreFormData>()

    useEffect(() => {
        const load = async () => {
            const res = await getStoreSettings()
            if (res.success && res.data) {
                const d = res.data
                reset({
                    name: d.name || "",
                    description: d.description || "",
                    phone: d.phone || "",
                    email: d.email || "",
                    whatsapp: d.whatsapp || "",
                    website: d.website || "",
                    address: d.address || "",
                    city: d.city || "",
                    country: d.country || "",
                })
                if (d.logo) setLogoUrl(d.logo)
                if (d.socialLinks && typeof d.socialLinks === "object") {
                    setSocialLinks({ facebook: "", instagram: "", twitter: "", tiktok: "", ...(d.socialLinks as any) })
                }
                if (d.workingHours && typeof d.workingHours === "object") {
                    setWorkingHours(prev => ({ ...prev, ...(d.workingHours as any) }))
                }
            }
            setLoading(false)
        }
        load()
    }, [reset])

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingLogo(true)
        const formData = new FormData()
        formData.append("file", file)
        const res = await uploadStoreLogo(formData)
        if (res.success && res.url) {
            setLogoUrl(res.url)
            toast.success("تم رفع الشعار بنجاح")
        } else {
            toast.error(res.error || "فشل رفع الشعار")
        }
        setUploadingLogo(false)
        // Reset input
        if (logoInputRef.current) logoInputRef.current.value = ""
    }

    const handleLogoDelete = async () => {
        if (!confirm("هل تريد حذف الشعار؟")) return
        const res = await deleteStoreLogo()
        if (res.success) {
            setLogoUrl(null)
            toast.success("تم حذف الشعار")
        } else {
            toast.error(res.error || "فشل حذف الشعار")
        }
    }

    const onSubmit = async (data: StoreFormData) => {
        setSaving(true)
        const res = await updateStoreSettings({
            ...data,
            workingHours,
            socialLinks,
        })
        if (res.success) {
            toast.success("تم حفظ إعدادات المتجر بنجاح")
        } else {
            toast.error(res.error || "فشل حفظ الإعدادات")
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Store className="h-8 w-8 text-primary" />
                    إعدادات المتجر
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    إدارة معلومات المتجر الأساسية والهوية البصرية
                </p>
            </div>

            {/* ── Store Identity Preview ── */}
            <div className="glass-panel rounded-2xl border border-border/50 p-8">
                <div className="flex items-center gap-6">
                    {/* Logo Upload Area */}
                    <div className="relative group shrink-0">
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                        <div
                            onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                            className="relative size-28 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10 group"
                        >
                            {uploadingLogo ? (
                                <Loader2 className="size-8 animate-spin text-primary" />
                            ) : logoUrl ? (
                                <>
                                    <Image
                                        src={logoUrl}
                                        alt="شعار المتجر"
                                        fill
                                        className="object-contain p-2"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-2xl">
                                        <Camera className="size-5 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    <ImageIcon className="size-8" />
                                    <span className="text-[10px] font-bold">رفع الشعار</span>
                                </div>
                            )}
                        </div>

                        {logoUrl && (
                            <button
                                type="button"
                                onClick={handleLogoDelete}
                                className="absolute -top-2 -left-2 size-7 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Store Preview Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black tracking-tight truncate">
                                {/* Show real-time name from form */}
                                إعدادات الهوية البصرية
                            </h2>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            الشعار يظهر في الشريط الجانبي وأعلى الصفحة. يُفضل رفع صورة مربعة بخلفية شفافة (PNG أو WebP).
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl gap-2 text-xs font-bold h-8"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={uploadingLogo}
                            >
                                <Upload className="size-3.5" />
                                {logoUrl ? "تغيير الشعار" : "رفع شعار"}
                            </Button>
                            {logoUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl gap-2 text-xs font-bold h-8 text-destructive hover:text-destructive"
                                    onClick={handleLogoDelete}
                                >
                                    <Trash2 className="size-3.5" />
                                    حذف
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* ── Section 1: Basic Info ── */}
                <div className="glass-panel rounded-2xl border border-border/50 p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="size-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">المعلومات الأساسية</h2>
                            <p className="text-xs text-muted-foreground">اسم المتجر والوصف العام</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">اسم المتجر *</Label>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="مثال: متجر نواة"
                                {...register("name", { required: "اسم المتجر مطلوب" })}
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <FileText className="size-3.5 text-muted-foreground" />
                                وصف المتجر
                            </Label>
                            <Textarea
                                className="rounded-xl resize-none min-h-[80px]"
                                placeholder="وصف مختصر عن متجرك ونشاطه..."
                                {...register("description")}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Contact Info ── */}
                <div className="glass-panel rounded-2xl border border-border/50 p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Phone className="size-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">معلومات الاتصال</h2>
                            <p className="text-xs text-muted-foreground">أرقام الهاتف والبريد الإلكتروني</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Phone className="size-3.5 text-muted-foreground" />
                                رقم الهاتف
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono"
                                placeholder="+967 XXX XXX XXX"
                                dir="ltr"
                                {...register("phone")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <MessageCircle className="size-3.5 text-emerald-600" />
                                واتساب
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono"
                                placeholder="+967 XXX XXX XXX"
                                dir="ltr"
                                {...register("whatsapp")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Mail className="size-3.5 text-blue-600" />
                                البريد الإلكتروني
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono"
                                placeholder="store@example.com"
                                dir="ltr"
                                type="email"
                                {...register("email")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Globe className="size-3.5 text-indigo-600" />
                                الموقع الإلكتروني
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono"
                                placeholder="https://example.com"
                                dir="ltr"
                                {...register("website")}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section 3: Address ── */}
                <div className="glass-panel rounded-2xl border border-border/50 p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <MapPin className="size-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">العنوان والموقع</h2>
                            <p className="text-xs text-muted-foreground">عنوان المتجر الفعلي</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">العنوان التفصيلي</Label>
                            <Textarea
                                className="rounded-xl resize-none min-h-[60px]"
                                placeholder="الشارع، الحي، رقم المبنى..."
                                {...register("address")}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">المدينة</Label>
                                <Input className="h-11 rounded-xl" placeholder="مثلاً: صنعاء" {...register("city")} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">البلد</Label>
                                <Input className="h-11 rounded-xl" placeholder="مثلاً: اليمن" {...register("country")} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section 4: Working Hours ── */}
                <div className="glass-panel rounded-2xl border border-border/50 p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Clock className="size-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">ساعات العمل</h2>
                            <p className="text-xs text-muted-foreground">أوقات العمل الأسبوعية</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        {DAYS.map(day => {
                            const h = workingHours[day.key]
                            return (
                                <div
                                    key={day.key}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                                        h?.closed ? "bg-muted/20 border-border/30 opacity-60" : "border-border/50"
                                    }`}
                                >
                                    <span className="text-sm font-bold w-20 shrink-0">{day.label}</span>

                                    <button
                                        type="button"
                                        onClick={() => setWorkingHours(prev => ({
                                            ...prev,
                                            [day.key]: { ...prev[day.key], closed: !prev[day.key].closed }
                                        }))}
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                                            h?.closed
                                                ? "bg-red-500/10 text-red-600 border-red-200"
                                                : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                        }`}
                                    >
                                        {h?.closed ? "مغلق" : "مفتوح"}
                                    </button>

                                    {!h?.closed && (
                                        <div className="flex items-center gap-2 mr-auto">
                                            <Input
                                                type="time"
                                                className="h-8 w-28 rounded-lg text-xs font-mono"
                                                value={h?.from || "08:00"}
                                                onChange={(e) => setWorkingHours(prev => ({
                                                    ...prev,
                                                    [day.key]: { ...prev[day.key], from: e.target.value }
                                                }))}
                                            />
                                            <span className="text-xs text-muted-foreground">—</span>
                                            <Input
                                                type="time"
                                                className="h-8 w-28 rounded-lg text-xs font-mono"
                                                value={h?.to || "17:00"}
                                                onChange={(e) => setWorkingHours(prev => ({
                                                    ...prev,
                                                    [day.key]: { ...prev[day.key], to: e.target.value }
                                                }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Section 5: Social Links ── */}
                <div className="glass-panel rounded-2xl border border-border/50 p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                            <Share2 className="size-5 text-pink-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">الروابط الاجتماعية</h2>
                            <p className="text-xs text-muted-foreground">حسابات التواصل الاجتماعي</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Facebook className="size-3.5 text-blue-600" />
                                فيسبوك
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono text-xs"
                                placeholder="https://facebook.com/..."
                                dir="ltr"
                                value={socialLinks.facebook}
                                onChange={e => setSocialLinks(p => ({ ...p, facebook: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Instagram className="size-3.5 text-pink-600" />
                                إنستغرام
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono text-xs"
                                placeholder="https://instagram.com/..."
                                dir="ltr"
                                value={socialLinks.instagram}
                                onChange={e => setSocialLinks(p => ({ ...p, instagram: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Twitter className="size-3.5 text-sky-500" />
                                تويتر / X
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono text-xs"
                                placeholder="https://x.com/..."
                                dir="ltr"
                                value={socialLinks.twitter}
                                onChange={e => setSocialLinks(p => ({ ...p, twitter: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34A6.34 6.34 0 0 0 15.83 15.3V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z"/>
                                </svg>
                                تيك توك
                            </Label>
                            <Input
                                className="h-11 rounded-xl font-mono text-xs"
                                placeholder="https://tiktok.com/@..."
                                dir="ltr"
                                value={socialLinks.tiktok}
                                onChange={e => setSocialLinks(p => ({ ...p, tiktok: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pb-8">
                    <Button
                        type="submit"
                        disabled={saving}
                        size="lg"
                        className="gap-3 rounded-xl px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    >
                        {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                        حفظ الإعدادات
                    </Button>
                </div>
            </form>
        </div>
    )
}
