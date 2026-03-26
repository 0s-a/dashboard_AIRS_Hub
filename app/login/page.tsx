"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck, Zap, BarChart3, Sparkles, ArrowLeft } from "lucide-react"
import { login } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getStoreSettings } from "@/lib/actions/store-settings"

const FEATURES = [
    { icon: ShieldCheck, label: "آمن وموثوق", desc: "حماية كاملة لبياناتك", delay: 0 },
    { icon: Zap,          label: "سريع وفعّال",  desc: "أداء عالٍ في كل وقت", delay: 100 },
    { icon: BarChart3,    label: "تحليلات فورية", desc: "قرارات مبنية على بيانات", delay: 200 },
]

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [storeInfo, setStoreInfo] = useState<{ name: string; logo: string | null; description: string | null }>({
        name: "نواة",
        logo: null,
        description: null
    })

    useEffect(() => {
        setMounted(true)
        getStoreSettings().then(res => {
            if (res.success && res.data) {
                setStoreInfo({
                    name: res.data.name || "نواة",
                    logo: res.data.logo || null,
                    description: res.data.description || null
                })
            }
        })
    }, [])

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
        <div className="min-h-screen flex overflow-hidden" dir="rtl">

            {/* ═══ Global CSS ═══ */}
            <style>{`
                @keyframes gradientFlow {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes orbDrift1 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    33% { transform: translate(30px,-40px) scale(1.1); }
                    66% { transform: translate(-15px,20px) scale(0.95); }
                }
                @keyframes orbDrift2 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    40% { transform: translate(-35px,25px) scale(1.05); }
                    70% { transform: translate(25px,-25px) scale(0.9); }
                }
                @keyframes orbDrift3 {
                    0%, 100% { transform: translate(0,0) scale(1); opacity:0.1; }
                    50% { transform: translate(25px,-20px) scale(1.15); opacity:0.25; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes floatY {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeRight {
                    from { opacity: 0; transform: translateX(-20px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes ripple {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1), 0 0 0 10px rgba(255,255,255,0); }
                    50% { box-shadow: 0 0 0 8px rgba(255,255,255,0.08), 0 0 0 15px rgba(255,255,255,0.04); }
                }
                @keyframes glowPulse {
                    0%, 100% { filter: drop-shadow(0 0 5px rgba(99,102,241,0.3)); }
                    50% { filter: drop-shadow(0 0 15px rgba(99,102,241,0.6)); }
                }
            `}</style>

            {/* ══════════════════════════════════════════
                LEFT PANEL — Dark Animated Branding
            ══════════════════════════════════════════ */}
            <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden">

                {/* Animated gradient background - More premium color palette */}
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(-45deg, #0f172a, #1e1b4b, #312e81, #1e1b4b, #0f172a)',
                    backgroundSize: '400% 400%',
                    animation: 'gradientFlow 15s ease infinite',
                }} />

                {/* Noise grain */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }} />

                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.1]" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                }} />

                {/* Orbs - Refined blur and colors */}
                <div className="absolute -top-[10%] -left-[5%] w-[50%] h-[50%] rounded-full blur-[120px]"
                    style={{ background:'rgba(79,70,229,0.3)', animation:'orbDrift1 20s ease-in-out infinite' }} />
                <div className="absolute -bottom-[15%] -right-[10%] w-[45%] h-[45%] rounded-full blur-[100px]"
                    style={{ background:'rgba(124,58,237,0.2)', animation:'orbDrift2 25s ease-in-out infinite' }} />
                <div className="absolute top-[40%] left-[30%] w-[25%] h-[25%] rounded-full blur-[80px]"
                    style={{ background:'rgba(167,139,250,0.15)', animation:'orbDrift3 18s ease-in-out infinite' }} />

                {/* Decorative rings */}
                <div className="absolute top-[10%] right-[-10%] w-80 h-80 rounded-full border border-white/6" />
                <div className="absolute top-[6%] right-[-15%] w-104 h-104 rounded-full border border-white/4" />
                <div className="absolute bottom-[4%] left-[-10%] w-72 h-72 rounded-full border border-white/5" />

                {/* ── Top: System brand ── */}
                <div className="relative z-10 flex items-center justify-between"
                    style={{ animation: mounted ? 'fadeUp .8s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none' }}>
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 duration-500"
                            style={{ animation: 'ripple 4s ease-in-out infinite' }}>
                            <span className="text-white font-black text-2xl leading-none" style={{ fontFamily:'Georgia,serif' }}>ن</span>
                        </div>
                        <div>
                            <p className="text-white font-black text-xl leading-tight tracking-tight">نواة</p>
                            <p className="text-white/40 text-[10px] font-bold tracking-[0.4em] uppercase mt-1">NAWAAT PLATFORM</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                        <Sparkles className="size-3.5 text-indigo-400 group-hover:animate-pulse" />
                        <span className="text-white/70 text-[11px] font-bold tracking-wider">نظام إدارة ذكي</span>
                    </div>
                </div>

                {/* ── Middle: Store identity ── */}
                <div className="relative z-10 space-y-12">
                    {/* Watermark Logo Background */}
                    <div className="absolute -top-32 -right-16 text-[22rem] font-black leading-none select-none pointer-events-none opacity-[0.03]"
                        style={{ color:'white', fontFamily:'Georgia,serif' }}>
                        {storeInfo.name.charAt(0)}
                    </div>

                    <div className="space-y-8" style={{ animation: mounted ? 'fadeUp .9s .2s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none' }}>
                        {/* Welcome shimmer */}
                        <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-300">مرحباً بك في</p>
                        </div>

                        {/* Store logo + name */}
                        <div className="flex items-center gap-6">
                            {storeInfo.logo ? (
                                <div className="size-20 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0 flex items-center justify-center group"
                                    style={{ animation: 'floatY 5s ease-in-out infinite' }}>
                                    <Image src={storeInfo.logo} alt="شعار" fill className="object-contain p-3 transition-transform duration-700 group-hover:scale-110" unoptimized />
                                    <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ) : (
                                <div className="size-20 rounded-3xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl border border-white/10 shadow-2xl shrink-0 flex items-center justify-center"
                                    style={{ animation: 'floatY 5s ease-in-out infinite' }}>
                                    <span className="text-white font-black text-4xl leading-none drop-shadow-2xl" style={{ fontFamily:'Georgia,serif' }}>
                                        {storeInfo.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                            <div className="space-y-2">
                                <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight line-clamp-2">
                                    {storeInfo.name}
                                </h2>
                                {storeInfo.description && (
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-1 rounded-full bg-indigo-400" />
                                        <p className="text-white/50 text-[13px] font-medium line-clamp-1">{storeInfo.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-white/60 text-[15px] leading-relaxed max-w-md font-medium">
                            {storeInfo.description || "ارتقِ بتجارتك إلى آفاق جديدة مع منصة نواة المتكاملة لإدارة المخزون، المبيعات، ومراقبة الأداء لحظة بلحظة."}
                        </p>

                        <div className="w-20 h-1 rounded-full bg-linear-to-r from-indigo-500 to-transparent" />
                    </div>

                    {/* Feature list */}
                    <div className="grid grid-cols-1 gap-5">
                        {FEATURES.map(({ icon: Icon, label, desc, delay }) => (
                            <div key={label} className="flex items-center gap-5 group cursor-default p-3 -m-3 rounded-2xl hover:bg-white/5 transition-all duration-300"
                                style={{ animation: mounted ? `fadeRight .6s ${delay + 500}ms ease-out both` : 'none' }}>
                                <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:scale-110 transition-all duration-500 shadow-xl">
                                    <Icon className="size-5 text-white/70 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <div className="group-hover:translate-x-[-4px] transition-transform duration-300">
                                    <p className="text-white font-bold text-[15px] leading-none mb-1.5">{label}</p>
                                    <p className="text-white/40 text-xs font-medium">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Bottom copyright ── */}
                <div className="relative z-10" style={{ animation: mounted ? 'fadeUp .8s 1s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none' }}>
                    <div className="h-px w-full bg-linear-to-r from-white/10 via-white/5 to-transparent mb-4" />
                    <div className="flex items-center justify-between">
                        <p className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase">
                            © {new Date().getFullYear()} {storeInfo.name}
                        </p>
                        <p className="text-indigo-400/40 text-[9px] font-black tracking-widest uppercase">
                            POWERED BY NAWAAT
                        </p>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                RIGHT PANEL — Form
            ══════════════════════════════════════════ */}
            <div className="flex-1 relative flex flex-col items-center justify-center px-6 sm:px-10 lg:px-14 bg-[#f8fafc] dark:bg-[#020617]">

                {/* Background decorative elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-[0.05] dark:opacity-[0.1]"
                        style={{ background:'rgba(79,70,229,0.5)', animation:'orbDrift1 25s ease-in-out infinite' }} />
                    <div className="absolute bottom-[10%] left-[5%] w-[35%] h-[35%] rounded-full blur-[80px] opacity-[0.03] dark:opacity-[0.08]"
                        style={{ background:'rgba(124,58,237,0.4)', animation:'orbDrift2 30s ease-in-out infinite' }} />
                </div>

                {/* Refined Dot pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.4] dark:opacity-[0.2]" style={{
                    backgroundImage: 'radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)',
                    backgroundSize: '32px 32px',
                }} />

                <div className="relative z-10 w-full max-w-[420px]"
                    style={{ animation: mounted ? 'fadeUp .7s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none' }}>

                    {/* Mobile store header */}
                    <div className="flex lg:hidden items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            {storeInfo.logo ? (
                                <div className="relative size-12 rounded-2xl bg-white border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden shrink-0">
                                    <Image src={storeInfo.logo} alt="شعار" fill className="object-contain p-1" unoptimized />
                                </div>
                            ) : (
                                <div className="size-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                                    <span className="text-white font-black text-xl" style={{ fontFamily:'Georgia,serif' }}>{storeInfo.name.charAt(0)}</span>
                                </div>
                            )}
                            <div>
                                <p className="font-black text-lg text-slate-900 dark:text-white leading-tight">{storeInfo.name}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] uppercase mt-0.5">نواة</p>
                            </div>
                        </div>
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <ArrowLeft className="size-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-8 text-center lg:text-right">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">تسجيل الدخول</h1>
                        <p className="text-[15px] text-slate-500 dark:text-slate-400">أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك</p>
                    </div>

                    {/* Form card — Glassmorphism Enhanced */}
                    <div className="relative group">
                        {/* Outer Glow Effect */}
                        <div className="absolute -inset-1 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                        
                        <div className="relative rounded-[1.75rem] border border-white dark:border-white/10 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
                            {/* Animated top accent bar */}
                            <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-[gradientFlow_3s_linear_infinite]" />

                            <div className="p-8 sm:p-10 space-y-6">
                                <form onSubmit={handleSubmit} className="space-y-5">

                                    {/* Username */}
                                    <div className="space-y-2">
                                        <Label htmlFor="username" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mr-1">
                                            اسم المستخدم
                                        </Label>
                                        <div className="relative group/input">
                                            <Input
                                                id="username"
                                                type="text"
                                                placeholder="اسم المستخدم الخاص بك"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:bg-white dark:hover:bg-slate-950 transition-all px-4 text-[15px] font-medium"
                                                disabled={isLoading}
                                                autoComplete="username"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mr-1">
                                            كلمة المرور
                                        </Label>
                                        <div className="relative group/input">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:bg-white dark:hover:bg-slate-950 transition-all pe-12 text-[15px] font-medium"
                                                disabled={isLoading}
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <div className="flex items-center gap-3 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl border border-red-500/20 animate-in fade-in zoom-in-95 duration-300">
                                            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                                            {error}
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={isLoading || !username.trim() || !password.trim()}
                                        className="w-full h-12 rounded-xl font-bold text-[15px] gap-3 mt-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {isLoading ? (
                                            <><Loader2 className="size-5 animate-spin" />جاري التحقق...</>
                                        ) : (
                                            <><LogIn className="size-5" />تسجيل الدخول</>
                                        )}
                                    </Button>
                                </form>

                                {/* Bottom Decorative Section */}
                                <div className="pt-2 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/5" />
                                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 tracking-[0.3em] uppercase">نواة v2.0</span>
                                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/5" />
                                    </div>

                                    <div className="flex items-center justify-center gap-3 py-1 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5">
                                        <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">كل الأنظمة تعمل بكفاءة عالية</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-[10px] text-slate-400 dark:text-muted-foreground/35 mt-6 tracking-wide">
                        © {new Date().getFullYear()} {storeInfo.name} · Powered by Nawaat
                    </p>
                </div>
            </div>
        </div>
    )
}
