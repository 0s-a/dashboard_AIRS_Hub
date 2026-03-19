"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wand2, Eye, EyeOff, LogIn, Loader2 } from "lucide-react"
import { login } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden" dir="rtl">
            {/* Background decorative elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/5 dark:bg-primary/20 rounded-full blur-[150px]" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] w-[25%] h-[25%] bg-primary/3 dark:bg-primary/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="glass-panel rounded-3xl border border-border/50 p-10 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4 hover:rotate-12 transition-transform duration-500">
                            <Wand2 className="size-8 text-white" />
                        </div>
                        <h1 className="font-bold text-2xl tracking-tight bg-linear-to-r from-primary to-indigo-500 bg-clip-text text-transparent italic">
                            HUSAM-AI
                        </h1>
                        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                            إدارة المتاجر الذكية
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-sm font-semibold text-foreground/80">
                                اسم المستخدم
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="أدخل اسم المستخدم"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                                disabled={isLoading}
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">
                                كلمة المرور
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="أدخل كلمة المرور"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all pe-10"
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm font-medium px-4 py-3 rounded-xl border border-destructive/20 text-center animate-in fade-in slide-in-from-top-1 duration-300">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isLoading || !username.trim() || !password.trim()}
                            className="w-full h-11 rounded-xl font-bold text-base gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
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
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-muted-foreground/50 mt-6">
                    © {new Date().getFullYear()} HUSAM-AI — جميع الحقوق محفوظة
                </p>
            </div>
        </div>
    )
}
