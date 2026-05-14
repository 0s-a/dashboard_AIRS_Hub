"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface CopyableBadgeProps {
    value: string
    successMessage?: string
    className?: string
}

/**
 * Inline badge that copies its value to clipboard on click.
 * Shows an animated ✓ icon for 1.5s after copying.
 */
export function CopyableBadge({
    value,
    successMessage = "تم النسخ",
    className,
}: CopyableBadgeProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success(successMessage)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div
            className={[
                "flex items-center gap-1 group/copy cursor-pointer",
                "bg-muted/40 hover:bg-muted/60 px-1.5 py-0.5 rounded transition-colors",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={handleCopy}
        >
            <span className="text-muted-foreground font-mono">{value}</span>
            {copied ? (
                <Check className="h-2.5 w-2.5 text-emerald-600 transition-colors" />
            ) : (
                <Copy className="h-2.5 w-2.5 text-muted-foreground/50 group-hover/copy:text-primary transition-colors" />
            )}
        </div>
    )
}
