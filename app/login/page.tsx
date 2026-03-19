"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck, Zap, BarChart3 } from "lucide-react"
import { login } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const FEATURES = [
    { icon: ShieldCheck, label: "آمن وموثوق", desc: "حماية كاملة لبياناتك" },
    { icon: Zap,          label: "سريع وفعّال",  desc: "أداء عالٍ في كل وقت" },
    { icon: BarChart3,    label: "تحليلات فورية", desc: "قرارات مبنية على بيانات" },
]

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)
        try {
            const result = await login(username, password)
            if (result.success) {
                router.push("/")
                router.refresh()
            } else {
                setError(result.error)
            }
        } catch {
            setError("حدث خطأ غير متوقع")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-background overflow-hidden" dir="rtl">

            {/* ═══════════════ LEFT PANEL — Branding ═══════════════ */}
            <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden">

                {/* Deep gradient background */}
                <div className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary))] via-indigo-700 to-violet-900" />

                {/* Noise texture overlay */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Glowing orbs */}
                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-indigo-400/20 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-violet-400/15 rounded-full blur-[80px]" />

                {/* Decorative circles (geometric) */}
                <div className="absolute top-[12%] right-[-8%] w-72 h-72 rounded-full border border-white/10" />
                <div className="absolute top-[8%]  right-[-12%] w-96 h-96 rounded-full border border-white/5" />
                <div className="absolute bottom-[5%] left-[-8%]  w-80 h-80 rounded-full border border-white/8" />

                {/* ── Top logo ── */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
                        <span className="text-white font-black text-2xl leading-none" style={{ fontFamily: 'Georgia, serif' }}>ن</span>
                    </div>
                    <div>
                        <p className="text-white font-black text-xl leading-none">نواة</p>
                        <p className="text-white/50 text-[10px] font-semibold tracking-[0.3em] uppercase mt-0.5">Nawaat</p>
                    </div>
                </div>

                {/* ── Center hero text ── */}
                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        {/* Big Arabic "ن" watermark */}
                        <div
                            className="absolute -top-20 -right-8 text-[18rem] font-black text-white/[0.03] leading-none select-none pointer-events-none"
                            style={{ fontFamily: 'Georgia, serif' }}
                        >
                            ن
                        </div>

                        <p className="text-white/60 text-sm font-semibold tracking-widest uppercase">منصة الأعمال الذكية</p>
                        <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.15]">
                            أدِر أعمالك<br />
                            <span className="text-white/50">بذكاء واقتدار</span>
                        </h2>
                        <p className="text-white/60 text-base leading-relaxed max-w-sm">
                            منصة نواة المتكاملة لإدارة المخزون والمبيعات وتحليل البيانات — كل ما تحتاجه في مكان واحد.
                        </p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-4">
                        {FEATURES.map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="flex items-center gap-4 group">
                                <div className="size-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors duration-300">
                                    <Icon className="size-5 text-white/80" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{label}</p>
                                    <p className="text-white/50 text-xs">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Bottom quote ── */}
                <div className="relative z-10">
                    <p className="text-white/30 text-xs">
                        © {new Date().getFullYear()} نواة (Nawaat) — جميع الحقوق محفوظة
                    </p>
                </div>
            </div>

            {/* ═══════════════ RIGHT PANEL — Form ═══════════════ */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 relative">

                {/* Subtle background blobs for right panel */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-[30%] -right-[20%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px]" />
                    <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
                </div>

                <div className="relative z-10 w-full max-w-[400px] space-y-8">

                    {/* Mobile logo (visible only on small screens) */}
                    <div className="flex lg:hidden items-center gap-3 mb-2">
                        <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="text-white font-black text-xl leading-none" style={{ fontFamily: 'Georgia, serif' }}>ن</span>
                        </div>
                        <div>
                            <p className="font-black text-lg bg-linear-to-r from-primary to-indigo-500 bg-clip-text text-transparent">نواة</p>
                            <p className="text-[9px] text-muted-foreground font-bold tracking-[0.25em] uppercase">Nawaat</p>
                        </div>
                    </div>

                    {/* Header text */}
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-black text-foreground">مرحباً بعودتك 👋</h1>
                        <p className="text-sm text-muted-foreground">أدخل بياناتك لتسجيل الدخول إلى حسابك</p>
                    </div>

                    {/* Form card */}
                    <div className="glass-panel rounded-2xl border border-border/60 p-8 shadow-xl shadow-black/5 space-y-5">
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Username */}
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-sm font-bold text-foreground/80">
                                    اسم المستخدم
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="أدخل اسم المستخدم"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="h-12 rounded-xl bg-muted/40 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all pr-4 text-sm"
                                        disabled={isLoading}
                                        autoComplete="username"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-bold text-foreground/80">
                                    كلمة المرور
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 rounded-xl bg-muted/40 border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all pe-12 text-sm"
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-3 bg-destructive/8 text-destructive text-sm font-medium px-4 py-3 rounded-xl border border-destructive/15 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="size-1.5 rounded-full bg-destructive shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={isLoading || !username.trim() || !password.trim()}
                                className="w-full h-12 rounded-xl font-bold text-sm gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 mt-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        جاري تسجيل الدخول...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="size-4" />
                                        تسجيل الدخول
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 pt-1">
                            <div className="h-px flex-1 bg-border/50" />
                            <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">نواة الإصدار 1.0</span>
                            <div className="h-px flex-1 bg-border/50" />
                        </div>

                        {/* System status badge */}
                        <div className="flex items-center justify-center gap-2">
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
                            <span className="text-[11px] text-muted-foreground/60 font-medium">جميع الأنظمة تعمل بشكل طبيعي</span>
                        </div>
                    </div>

                    {/* Footer note */}
                    <p className="text-center text-[11px] text-muted-foreground/40 tracking-wide lg:hidden">
                        © {new Date().getFullYear()} نواة (Nawaat) — جميع الحقوق محفوظة
                    </p>
                </div>
            </div>
        </div>
    )
}
