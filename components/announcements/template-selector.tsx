"use client"

/**
 * components/announcements/template-selector.tsx
 *
 * اختيار قالب رسالة + معاينة فقط.
 * الإنشاء والتعديل متاح من صفحة /announcements/templates.
 */

import { useState, useEffect, useCallback } from "react"
import {
    Loader2, FileText, ImageIcon, Check,
    Sparkles, Eye, EyeOff, ExternalLink, ChevronDown, Layers,
} from "lucide-react"
import { Label }  from "@/components/ui/label"
import { cn }     from "@/lib/utils"
import Link       from "next/link"
import {
    getMessageTemplates,
    seedDefaultTemplates,
} from "@/lib/actions/message-templates"
import { previewTemplateRender } from "@/lib/utils/message-builder"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateSelectorProps {
    selectedId: string | null
    onSelect:   (templateId: string | null) => void
    disabled?:  boolean
}

interface TemplateRow {
    id:           string
    name:         string
    type:         string
    sendMode:     string
    bodyTemplate: string
    productBlock: string
    separator:    string
    isDefault:    boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateSelector({
    selectedId, onSelect, disabled = false,
}: TemplateSelectorProps) {
    const [templates,    setTemplates]    = useState<TemplateRow[]>([])
    const [loading,      setLoading]      = useState(true)
    const [showPreview,  setShowPreview]  = useState(false)

    // Load templates (seed defaults on first run)
    const load = useCallback(async () => {
        setLoading(true)
        await seedDefaultTemplates()
        const res = await getMessageTemplates()
        if (res.success && res.data) {
            const list = res.data as TemplateRow[]
            setTemplates(list)
            // Auto-select default if nothing selected yet
            if (!selectedId && list.length > 0) {
                const def = list.find(t => t.isDefault) ?? list[0]
                onSelect(def.id)
            }
        }
        setLoading(false)
    }, [selectedId, onSelect])

    useEffect(() => { load() }, [load])

    const selected = templates.find(t => t.id === selectedId)

    // Preview rendered output — always show the first message (works for both modes)
    const preview = selected
        ? previewTemplateRender({
            bodyTemplate: selected.bodyTemplate,
            productBlock: selected.productBlock,
            separator:    selected.separator,
            type:         selected.type as "text" | "text_image",
            sendMode:     (selected.sendMode ?? "combined") as "combined" | "per_product",
        })[0]
        : null

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="size-4 animate-spin" />
                جاري تحميل القوالب...
            </div>
        )
    }

    return (
        <div className="space-y-3">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    قالب الرسالة
                </Label>
                <Link
                    href="/announcements/templates"
                    target="_blank"
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                    <ExternalLink className="size-3" />
                    إدارة القوالب
                </Link>
            </div>

            {/* ── Template Cards ── */}
            {templates.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 rounded-xl border border-dashed border-border/50 text-center">
                    <Sparkles className="size-8 text-amber-400/40" />
                    <p className="text-xs font-bold text-muted-foreground">لا توجد قوالب</p>
                    <Link href="/announcements/templates" target="_blank"
                        className="text-xs text-primary hover:underline font-semibold">
                        أنشئ قالباً من هنا
                    </Link>
                </div>
            ) : (
                <div className="grid gap-2">
                    {templates.map(t => {
                        const isSelected = t.id === selectedId
                        const TypeIcon   = t.type === "text_image" ? ImageIcon : FileText

                        return (
                            <button
                                key={t.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                    onSelect(t.id)
                                    setShowPreview(false)
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-xl border p-3 text-right transition-all duration-200",
                                    isSelected
                                        ? "border-primary/40 bg-primary/5 shadow-sm"
                                        : "border-border/40 bg-muted/10 hover:border-border hover:bg-muted/20",
                                    disabled && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                    isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
                                )}>
                                    <TypeIcon className="size-4" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        {t.isDefault && (
                                            <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 rounded px-1.5 py-0.5 shrink-0">
                                                افتراضي
                                            </span>
                                        )}
                                        <span className="text-sm font-bold truncate">{t.name}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                                        {t.type === "text_image" ? "نص + صور" : "نص فقط"}
                                        {t.sendMode === "per_product" && (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-violet-500/10 text-violet-600 rounded px-1.5 py-0.5">
                                                <Layers className="size-2.5" /> رسالة لكل منتج
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Check */}
                                {isSelected && (
                                    <Check className="size-4 text-primary shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ── Preview Toggle (selected template only) ── */}
            {selected && (
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => setShowPreview(v => !v)}
                        className={cn(
                            "w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                            showPreview
                                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                                : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            {showPreview
                                ? <EyeOff className="size-3.5" />
                                : <Eye className="size-3.5" />
                            }
                            معاينة القالب المختار
                        </span>
                        <ChevronDown className={cn(
                            "size-3.5 transition-transform duration-200",
                            showPreview && "rotate-180"
                        )} />
                    </button>

                    {showPreview && preview && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                معاينة ببيانات وهمية
                            </p>

                            {/* Message body */}
                            <div className="bg-background rounded-lg border border-border/40 p-4">
                                <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans" dir="auto">
                                    {preview.messageBody}
                                </pre>
                            </div>

                            {/* Image URLs (text_image) */}
                            {preview.imageUrls.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-emerald-600">
                                        🖼 صور مرفقة ({preview.imageUrls.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {preview.imageUrls.map((url, i) => (
                                            <span key={i} className="text-[10px] font-mono bg-muted rounded px-2 py-0.5 text-muted-foreground truncate max-w-52">
                                                {url}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/20 flex-wrap">
                                <span>👤 {preview.customerName}</span>
                                <span>📋 {preview.templateType === "text_image" ? "نص + صور" : "نص فقط"}</span>
                                {selected.sendMode === "per_product" && (
                                    <span className="flex items-center gap-0.5 font-bold text-violet-600">
                                        <Layers className="size-3" /> رسالة مستقلة لكل منتج
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
