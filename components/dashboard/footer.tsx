"use client"

import { Code2, Heart, Zap } from "lucide-react"

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="relative mt-auto w-full">
            {/* Gradient top border */}
            <div className="h-px w-full bg-linear-to-l from-transparent via-primary/30 to-transparent" />

            <div className="glass-panel border-t-0 px-8 sm:px-10 py-4">
                <div className="max-w-(--breakpoint-2xl) mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Copyright */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                        <span>© {currentYear}</span>
                        <span className="font-black bg-linear-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                            نواة
                        </span>
                        <span className="hidden sm:inline text-border">|</span>
                        <span className="hidden sm:inline">جميع الحقوق محفوظة</span>
                    </div>

                    {/* Developer credit */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 group">
                        <span>صُنع بـ</span>
                        <Heart className="size-3.5 text-red-500/60 group-hover:text-red-500 group-hover:scale-125 transition-all duration-300 fill-red-500/60 group-hover:fill-red-500" />
                        <span>و</span>
                        <Code2 className="size-3.5 text-primary/60 group-hover:text-primary group-hover:rotate-12 transition-all duration-300" />
                        <span>بواسطة</span>
                        <span className="font-bold text-foreground/60 group-hover:text-primary transition-colors duration-300">
                            حسام
                        </span>
                    </div>

                    {/* Version badge */}
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/40 bg-muted/30 px-3 py-1.5 rounded-full border border-border/20">
                            <Zap className="size-3 text-primary/50" />
                            <span>v2.0</span>
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.4)] animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
