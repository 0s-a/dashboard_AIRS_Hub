"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

export function CopyButton({ value }: { value: string }) {
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(value)
                toast.success("تم النسخ", { duration: 1500 })
            }}
            className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
            title="نسخ"
        >
            <Copy className="size-3 text-muted-foreground" />
        </button>
    )
}

export function ContactLine({ icon, value, href, external, label }: {
    icon: string
    value: string
    href: string
    external?: boolean
    label?: string
}) {
    return (
        <div className="flex items-center gap-2 group">
            <span className="text-base">{icon}</span>
            <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                dir="ltr"
            >
                {value}
            </a>
            {label && <span className="text-[10px] text-emerald-600 font-medium">{label}</span>}
            <CopyButton value={value} />
        </div>
    )
}
