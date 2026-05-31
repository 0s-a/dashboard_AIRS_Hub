"use client"

/**
 * components/announcements/template-editor.tsx
 *
 * Professional template editor with:
 *  - Split-screen edit + live preview
 *  - Starter templates (preset library)
 *  - Character counter + WhatsApp 4096 limit warning
 *  - Undo / Redo history (20 steps)
 *  - Variable chips with cursor-aware insertion
 *  - Copy rendered output
 *  - Template stats (word count, variable usage)
 */

import { useState, useRef, useCallback, useEffect, useReducer } from "react"
import {
    FileText, ImageIcon, Eye, Type, Package,
    Copy, Check, Undo, Redo, Zap, ChevronDown,
    AlertTriangle, Info, BookOpen, Columns2, Layers,
} from "lucide-react"
import { Label }   from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button }  from "@/components/ui/button"
import { cn }      from "@/lib/utils"
import { toast }   from "sonner"
import {
    BODY_VARIABLES, PRODUCT_VARIABLES,
    previewTemplateRender,
} from "@/lib/utils/message-builder"

// ─── Constants ────────────────────────────────────────────────────────────────

const WA_CHAR_LIMIT = 4096

// ─── Starter Templates ────────────────────────────────────────────────────────

const STARTER_TEMPLATES = [
    {
        id:          "simple",
        label:       "بسيط",
        icon:        "📝",
        description: "رسالة مباشرة مع قائمة المنتجات",
        type:        "text" as const,
        sendMode:    "combined" as const,
        bodyTemplate: `مرحباً {{customer.name}} 👋

لدينا عروض جديدة خصيصاً لك:

{{products}}

للطلب تواصل معنا مباشرة ✨`,
        productBlock: `📦 *{{product.name}}*
رقم: {{product.itemNumber}}
الألوان: {{product.variants}}`,
        separator: "\n\n",
    },
    {
        id:          "vip",
        label:       "VIP",
        icon:        "👑",
        description: "رسالة مميزة لعملاء المجموعات",
        type:        "text" as const,
        sendMode:    "combined" as const,
        bodyTemplate: `أهلاً وسهلاً {{customer.name}} 🌟

بصفتك عضواً مميزاً، نسعد بتقديم أحدث مجموعتنا الحصرية:

{{products}}

🎁 خصم خاص متاح لك — تواصل معنا الآن!`,
        productBlock: `✨ *{{product.name}}*
│ رقم المنتج: \`{{product.itemNumber}}\`
│ متوفر بـ: {{product.variants}}`,
        separator: "\n\n─────\n\n",
    },
    {
        id:          "catalog",
        label:       "كتالوج",
        icon:        "📚",
        description: "كتالوج منتجات مع صور",
        type:        "text_image" as const,
        sendMode:    "combined" as const,
        bodyTemplate: `السلام عليكم {{customer.name}} 👋

🛍️ *كتالوج المنتجات الجديد*

إليك أحدث التشكيلة المتوفرة لدينا:

{{products}}

📲 للطلب أو الاستفسار تواصل معنا`,
        productBlock: `🏷️ *{{product.name}}*
   📌 {{product.itemNumber}}
   🎨 {{product.variants}}
   🖼️ {{product.image}}`,
        separator: "\n\n",
    },
    {
        id:          "offer",
        label:       "عرض",
        icon:        "🔥",
        description: "رسالة عرض ترويجي مع إلحاح",
        type:        "text" as const,
        sendMode:    "combined" as const,
        bodyTemplate: `⚡ عرض لفترة محدودة!

{{customer.name}}، لقد اخترنا لك هذه المنتجات بعناية:

{{products}}

⏰ العرض ساري لفترة محدودة فقط
📞 تواصل الآن لا تفوّت الفرصة!`,
        productBlock: `🔥 *{{product.name}}*
   # {{product.itemNumber}}
   🎨 {{product.variants}}`,
        separator: "\n\n",
    },
] as const

// ─── Undo / Redo ──────────────────────────────────────────────────────────────

interface EditorState {
    bodyTemplate: string
    productBlock: string
}

type HistoryAction =
    | { type: "SET"; payload: EditorState }
    | { type: "UNDO" }
    | { type: "REDO" }

interface HistoryState {
    past:    EditorState[]
    present: EditorState
    future:  EditorState[]
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
    switch (action.type) {
        case "SET": {
            if (
                action.payload.bodyTemplate === state.present.bodyTemplate &&
                action.payload.productBlock === state.present.productBlock
            ) return state
            return {
                past:    [...state.past.slice(-19), state.present],
                present: action.payload,
                future:  [],
            }
        }
        case "UNDO": {
            if (state.past.length === 0) return state
            const prev = state.past[state.past.length - 1]
            return {
                past:    state.past.slice(0, -1),
                present: prev,
                future:  [state.present, ...state.future],
            }
        }
        case "REDO": {
            if (state.future.length === 0) return state
            const next = state.future[0]
            return {
                past:    [...state.past, state.present],
                present: next,
                future:  state.future.slice(1),
            }
        }
    }
}

// ─── Variable Chip ────────────────────────────────────────────────────────────

function VariableChip({
    icon, label, variable, onClick, active, disabled,
}: {
    icon: string; label: string; variable: string
    onClick: () => void; active?: boolean; disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={`إدراج ${variable}`}
            className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold",
                "border transition-all duration-150 active:scale-95",
                disabled && "opacity-50 cursor-not-allowed",
                active
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border/60 bg-muted/30 hover:bg-primary/8 hover:border-primary/20 hover:text-primary"
            )}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ body, productBlock, type }: {
    body: string; productBlock: string; type: string
}) {
    const fullText = body + "\n" + productBlock
    const words    = fullText.trim().split(/\s+/).filter(Boolean).length
    const chars    = body.length

    const usedBodyVars    = BODY_VARIABLES.filter(v => body.includes(v.key)).length
    const usedProductVars = PRODUCT_VARIABLES.filter(v => productBlock.includes(v.key)).length

    const charPct    = Math.min(100, Math.round((chars / WA_CHAR_LIMIT) * 100))
    const charWarn   = charPct > 80
    const charDanger = charPct > 95

    return (
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground border-t border-border/20 pt-2">
            {/* Char counter */}
            <span className={cn(
                "flex items-center gap-1 font-bold",
                charDanger ? "text-destructive" : charWarn ? "text-amber-500" : "text-muted-foreground"
            )}>
                {charDanger ? <AlertTriangle className="size-3" /> : <Info className="size-3" />}
                {chars.toLocaleString("ar")} / {WA_CHAR_LIMIT.toLocaleString("ar")} حرف
                {charWarn && <span>({charPct}%)</span>}
            </span>
            <span>·</span>
            <span>{words} كلمة</span>
            <span>·</span>
            <span className="text-primary font-bold">{usedBodyVars + usedProductVars} متغير مستخدم</span>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateEditorProps {
    type:         'text' | 'text_image'
    sendMode:     'combined' | 'per_product'
    bodyTemplate: string
    productBlock: string
    separator:    string
    onTypeChange:         (type: 'text' | 'text_image') => void
    onSendModeChange:     (mode: 'combined' | 'per_product') => void
    onBodyTemplateChange: (value: string) => void
    onProductBlockChange: (value: string) => void
    onSeparatorChange:    (value: string) => void
    disabled?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateEditor({
    type, sendMode, bodyTemplate, productBlock, separator,
    onTypeChange, onSendModeChange, onBodyTemplateChange, onProductBlockChange, onSeparatorChange,
    disabled = false,
}: TemplateEditorProps) {

    // ── View mode ─────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("edit")

    // ── Active field (for variable insertion) ─────────────────────────────────
    const [activeField, setActiveField] = useState<'body' | 'product'>('body')
    const bodyRef    = useRef<HTMLTextAreaElement>(null)
    const productRef = useRef<HTMLTextAreaElement>(null)

    // ── Undo/Redo ─────────────────────────────────────────────────────────────
    const [history, dispatch] = useReducer(historyReducer, {
        past:    [],
        present: { bodyTemplate, productBlock },
        future:  [],
    })

    // Sync external changes → history
    useEffect(() => {
        dispatch({ type: "SET", payload: { bodyTemplate, productBlock } })
    }, [bodyTemplate, productBlock])

    const handleUndo = () => {
        dispatch({ type: "UNDO" })
        onBodyTemplateChange(history.past[history.past.length - 1]?.bodyTemplate ?? bodyTemplate)
        onProductBlockChange(history.past[history.past.length - 1]?.productBlock ?? productBlock)
    }
    const handleRedo = () => {
        dispatch({ type: "REDO" })
        onBodyTemplateChange(history.future[0]?.bodyTemplate ?? bodyTemplate)
        onProductBlockChange(history.future[0]?.productBlock ?? productBlock)
    }

    // ── Starter template application ─────────────────────────────────────────
    const [showStarters, setShowStarters] = useState(false)

    const applyStarter = (s: typeof STARTER_TEMPLATES[number]) => {
        onBodyTemplateChange(s.bodyTemplate)
        onProductBlockChange(s.productBlock)
        onSeparatorChange(s.separator)
        if ("type" in s && s.type) onTypeChange(s.type)
        if ("sendMode" in s && s.sendMode) onSendModeChange(s.sendMode)
        setShowStarters(false)
        toast.success(`تم تطبيق قالب "${s.label}" ✓`)
    }

    // ── Variable insertion ────────────────────────────────────────────────────
    const insertVariable = useCallback((variable: string, field: 'body' | 'product') => {
        const ref = field === 'body' ? bodyRef.current : productRef.current
        if (!ref) return

        const start    = ref.selectionStart
        const end      = ref.selectionEnd
        const newValue = ref.value.substring(0, start) + variable + ref.value.substring(end)

        if (field === 'body') onBodyTemplateChange(newValue)
        else                   onProductBlockChange(newValue)

        requestAnimationFrame(() => {
            ref.focus()
            ref.setSelectionRange(start + variable.length, start + variable.length)
        })
    }, [onBodyTemplateChange, onProductBlockChange])

    // ── Copy rendered ─────────────────────────────────────────────────────────
    const [copied, setCopied] = useState(false)
    const copyRendered = () => {
        const list = previewTemplateRender({ bodyTemplate, productBlock, separator, type, sendMode })
        const text = list.map(p => p.messageBody).join('\n\n─────\n\n')
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success(list.length > 1 ? `تم نسخ ${list.length} رسائل` : "تم نسخ الرسالة المُعالجة")
    }

    // ── Live preview ──────────────────────────────────────────────────────────
    const previews = previewTemplateRender({ bodyTemplate, productBlock, separator, type, sendMode })
    const preview  = previews[0]  // primary (first message or combined)

    const TYPE_OPTIONS = [
        { value: 'text' as const,       label: 'نص فقط',   icon: FileText   },
        { value: 'text_image' as const, label: 'نص + صور', icon: ImageIcon  },
    ]

    const SEPARATOR_OPTIONS = [
        { label: 'سطر فارغ', value: '\n\n'         },
        { label: '─────',    value: '\n─────\n'    },
        { label: '• • •',   value: '\n• • •\n'    },
        { label: '───',      value: '\n---\n'      },
        { label: 'بدون',     value: '\n'           },
    ]

    // Helper: is preview mode active?
    const showPreviewPanel = viewMode === "split" || viewMode === "preview"
    const showEditPanel    = viewMode === "edit"   || viewMode === "split"

    return (
        <div className="space-y-4">

            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between flex-wrap gap-2">

                {/* View toggle */}
                <div className="flex rounded-xl border border-border/60 overflow-hidden h-8 bg-muted/20">
                    {[
                        { id: "edit",    icon: Type,     title: "تحرير فقط"       },
                        { id: "split",   icon: Columns2, title: "تحرير + معاينة"  },
                        { id: "preview", icon: Eye,      title: "معاينة فقط"      },
                    ].map(({ id, icon: Icon, title }) => (
                        <button key={id} type="button" title={title}
                            disabled={disabled}
                            onClick={() => setViewMode(id as any)}
                            className={cn(
                                "px-3 flex items-center gap-1.5 text-xs font-bold transition-all duration-150 border-l border-border/30 first:border-0",
                                viewMode === id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            )}>
                            <Icon className="size-3.5" />
                            <span className="hidden sm:inline">{title}</span>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                    {/* Starter Templates */}
                    <div className="relative">
                        <button type="button"
                            disabled={disabled}
                            onClick={() => setShowStarters(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold border transition-all",
                                showStarters
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                                    : "border-border/60 bg-muted/20 hover:bg-amber-500/8 hover:border-amber-500/20 text-muted-foreground hover:text-amber-600"
                            )}>
                            <Zap className="size-3.5" />
                            قوالب جاهزة
                            <ChevronDown className={cn("size-3 transition-transform", showStarters && "rotate-180")} />
                        </button>

                        {showStarters && (
                            <div className="absolute top-full mt-1.5 right-0 z-50 w-72 rounded-xl border border-border shadow-xl bg-background p-1.5 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">
                                    اختر قالباً جاهزاً للبدء
                                </p>
                                {STARTER_TEMPLATES.map(s => (
                                    <button key={s.id} type="button"
                                        onClick={() => applyStarter(s)}
                                        className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-primary/5 transition-colors text-right group">
                                        <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold group-hover:text-primary">{s.label}</p>
                                            <p className="text-[10px] text-muted-foreground">{s.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Undo / Redo */}
                    <button type="button" disabled={disabled || history.past.length === 0}
                        onClick={handleUndo}
                        title="تراجع"
                        className={cn(
                            "size-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all",
                            history.past.length > 0 ? "hover:bg-muted/50 hover:text-foreground" : "opacity-40 cursor-not-allowed"
                        )}>
                        <Undo className="size-3.5" />
                    </button>
                    <button type="button" disabled={disabled || history.future.length === 0}
                        onClick={handleRedo}
                        title="إعادة"
                        className={cn(
                            "size-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all",
                            history.future.length > 0 ? "hover:bg-muted/50 hover:text-foreground" : "opacity-40 cursor-not-allowed"
                        )}>
                        <Redo className="size-3.5" />
                    </button>

                    {/* Copy rendered */}
                    <button type="button" onClick={copyRendered}
                        title="نسخ الرسالة المُعالجة"
                        className="size-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 transition-all">
                        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </button>
                </div>
            </div>

            {/* ── Type Selector ── */}
            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">نوع القالب</Label>
                <div className="flex rounded-xl border border-border/60 overflow-hidden bg-muted/30 p-0.5 gap-0.5">
                    {TYPE_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                            <button key={opt.value} type="button"
                                disabled={disabled}
                                onClick={() => onTypeChange(opt.value)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 px-3 rounded-[10px] transition-all duration-200",
                                    type === opt.value
                                        ? "bg-background shadow text-primary border border-primary/20"
                                        : "text-muted-foreground hover:text-foreground"
                                )}>
                                <Icon className="size-3.5" />
                                {opt.label}
                                {type === opt.value && opt.value === "text_image" && (
                                    <span className="text-[9px] bg-indigo-500/15 text-indigo-600 rounded-full px-1.5 font-bold">
                                        صور
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── Send Mode ── */}
            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="size-3" />
                    طريقة الإرسال
                </Label>
                <div className="flex rounded-xl border border-border/60 overflow-hidden bg-muted/30 p-0.5 gap-0.5">
                    <button type="button" disabled={disabled}
                        onClick={() => onSendModeChange('combined')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 px-3 rounded-[10px] transition-all duration-200",
                            sendMode === 'combined'
                                ? "bg-background shadow text-primary border border-primary/20"
                                : "text-muted-foreground hover:text-foreground"
                        )}>
                        <Package className="size-3.5" />
                        رسالة واحدة — كل المنتجات
                    </button>
                    <button type="button" disabled={disabled}
                        onClick={() => onSendModeChange('per_product')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 px-3 rounded-[10px] transition-all duration-200",
                            sendMode === 'per_product'
                                ? "bg-background shadow text-indigo-600 border border-indigo-400/30"
                                : "text-muted-foreground hover:text-foreground"
                        )}>
                        <Layers className="size-3.5" />
                        رسالة لكل منتج
                        {sendMode === 'per_product' && (
                            <span className="text-[9px] bg-indigo-500/15 text-indigo-600 rounded-full px-1.5 font-bold">n رسائل</span>
                        )}
                    </button>
                </div>
                {sendMode === 'per_product' && (
                    <p className="text-[10px] text-indigo-600/80 flex items-center gap-1">
                        <Layers className="size-3" />
                        كل منتج سيُرسل في رسالة مستقلة — المعاينة تعرض رسالة المنتج الأول
                    </p>
                )}
            </div>

            {/* ── Split view container ── */}
            <div className={cn(
                "gap-4",
                viewMode === "split" ? "grid grid-cols-2" : "block"
            )}>

                {/* ── Edit Panel ── */}
                {showEditPanel && (
                    <div className="space-y-4">

                        {/* Body template */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Type className="size-3.5 text-muted-foreground" />
                                    نص الرسالة الرئيسي
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {bodyTemplate.length} حرف
                                </span>
                            </div>
                            <div className="relative">
                                <Textarea
                                    ref={bodyRef}
                                    value={bodyTemplate}
                                    onChange={e => {
                                        onBodyTemplateChange(e.target.value)
                                        setActiveField('body')
                                    }}
                                    onFocus={() => setActiveField('body')}
                                    disabled={disabled}
                                    dir="auto"
                                    className={cn(
                                        "rounded-xl resize-none min-h-36 font-mono text-sm leading-relaxed transition-all",
                                        activeField === 'body' && !disabled && "ring-1 ring-primary/30 border-primary/30"
                                    )}
                                    placeholder={"مرحباً {{customer.name}} 👋\n\n{{products}}\n\nللطلب تواصل معنا ✨"}
                                />
                                {/* Char limit warning strip */}
                                {bodyTemplate.length > WA_CHAR_LIMIT * 0.8 && (
                                    <div className={cn(
                                        "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl transition-all",
                                        bodyTemplate.length >= WA_CHAR_LIMIT ? "bg-destructive" : "bg-amber-500"
                                    )} style={{
                                        width: `${Math.min(100, (bodyTemplate.length / WA_CHAR_LIMIT) * 100)}%`
                                    }} />
                                )}
                            </div>

                            {/* Body variable chips */}
                            <div className="flex flex-wrap gap-1.5">
                                {BODY_VARIABLES.map(v => (
                                    <VariableChip key={v.key}
                                        icon={v.icon} label={v.label} variable={v.key}
                                        active={activeField === 'body' && bodyTemplate.includes(v.key)}
                                        onClick={() => {
                                            setActiveField('body')
                                            insertVariable(v.key, 'body')
                                        }}
                                        disabled={disabled}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Product block */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Package className="size-3.5 text-indigo-500" />
                                    كتلة المنتج
                                    <span className="text-[10px] font-normal text-muted-foreground">(يتكرر لكل منتج)</span>
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {productBlock.length} حرف
                                </span>
                            </div>
                            <Textarea
                                ref={productRef}
                                value={productBlock}
                                onChange={e => {
                                    onProductBlockChange(e.target.value)
                                    setActiveField('product')
                                }}
                                onFocus={() => setActiveField('product')}
                                disabled={disabled}
                                dir="auto"
                                className={cn(
                                    "rounded-xl resize-none min-h-24 font-mono text-sm leading-relaxed transition-all",
                                    activeField === 'product' && !disabled && "ring-1 ring-indigo-400/40 border-indigo-400/30"
                                )}
                                placeholder={"📦 *{{product.name}}*\nرقم: {{product.itemNumber}}\nالألوان: {{product.variants}}"}
                            />

                            {/* Product variable chips — grouped */}
                            {(['أساسي','متغيرات','أسعار','وحدات','صور'] as const).map(group => {
                                const vars = PRODUCT_VARIABLES.filter(v => {
                                    const g = (v as any).group
                                    if (g !== group) return false
                                    // hide image vars when type is text-only
                                    if (type !== 'text_image' && (v.key === '{{product.image}}' || v.key === '{{product.images}}')) return false
                                    return true
                                })
                                if (vars.length === 0) return null
                                return (
                                    <div key={group} className="space-y-1">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-0.5">
                                            {group}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {vars.map(v => (
                                                <VariableChip key={v.key}
                                                    icon={v.icon} label={v.label} variable={v.key}
                                                    active={activeField === 'product' && productBlock.includes(v.key)}
                                                    onClick={() => {
                                                        setActiveField('product')
                                                        insertVariable(v.key, 'product')
                                                    }}
                                                    disabled={disabled}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}

                        </div>

                        {/* Separator  */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                الفاصل بين المنتجات
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                                {SEPARATOR_OPTIONS.map(opt => (
                                    <button key={opt.label} type="button"
                                        disabled={disabled}
                                        onClick={() => onSeparatorChange(opt.value)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                            separator === opt.value
                                                ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                                                : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground"
                                        )}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stats bar */}
                        <StatsBar body={bodyTemplate} productBlock={productBlock} type={type} />
                    </div>
                )}

                {/* ── Preview Panel ── */}
                {showPreviewPanel && (
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                                <Eye className="size-3.5" /> معاينة مباشرة
                                <span className="text-[10px] font-normal text-muted-foreground">(بيانات وهمية)</span>
                            </p>
                            <div className="flex items-center gap-2">
                                {sendMode === 'per_product' && (
                                    <span className="text-[10px] font-bold text-violet-600 bg-violet-500/10 rounded-lg px-2 py-1 flex items-center gap-1">
                                        <Layers className="size-3" /> {previews.length} رسائل
                                    </span>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-2 py-1">
                                    <span className="font-bold text-primary">{preview.messageBody.length.toLocaleString('ar')}</span>
                                    <span>/ {WA_CHAR_LIMIT.toLocaleString('ar')} حرف</span>
                                </div>
                            </div>
                        </div>

                        {/* Bubbles — one per message */}
                        {previews.map((msg, idx) => (
                            <div key={idx} className="rounded-2xl bg-[#075E54]/5 border border-[#075E54]/15 p-4">
                                {/* per_product label */}
                                {sendMode === 'per_product' && (
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <span className="text-[10px] font-bold text-violet-600 bg-violet-500/10 rounded-full px-2 py-0.5">
                                            رسالة {msg.productIndex} / {msg.totalProducts}
                                        </span>
                                    </div>
                                )}

                                {/* contact header */}
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#075E54]/10">
                                    <div className="size-8 rounded-full bg-[#075E54]/20 flex items-center justify-center text-sm font-bold text-[#075E54]">
                                        {msg.customerName?.[0] ?? 'أ'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold">{msg.customerName}</p>

                                    </div>
                                </div>

                                {/* message bubble */}
                                <div className="flex justify-start">
                                    <div className="max-w-[90%] bg-background rounded-2xl rounded-tl-sm shadow-sm border border-border/30 px-4 py-3">
                                        <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans" dir="auto">
                                            {msg.messageBody}
                                        </pre>
                                        <p className="text-[10px] text-muted-foreground text-left mt-1">
                                            {new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Image URLs */}
                                {msg.imageUrls.length > 0 && (
                                    <div className="mt-3 space-y-1.5">
                                        <p className="text-[10px] font-bold text-[#075E54]">
                                            🖼 {msg.imageUrls.length} صورة مرفقة
                                        </p>
                                        {msg.imageUrls.map((url, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-[#075E54]/5 rounded-lg p-2">
                                                <ImageIcon className="size-3 text-[#075E54] shrink-0" />
                                                <span className="text-[10px] font-mono text-muted-foreground truncate">{url}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Variables used */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                <BookOpen className="size-3" /> المتغيرات المستخدمة
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {BODY_VARIABLES.filter(v => bodyTemplate.includes(v.key)).map(v => (
                                    <span key={v.key} className="text-[10px] font-mono bg-primary/8 text-primary rounded-md px-2 py-0.5 border border-primary/15">
                                        {v.icon} {v.label}
                                    </span>
                                ))}
                                {PRODUCT_VARIABLES.filter(v => productBlock.includes(v.key)).map(v => (
                                    <span key={v.key} className="text-[10px] font-mono bg-indigo-500/8 text-indigo-600 rounded-md px-2 py-0.5 border border-indigo-500/15">
                                        {v.icon} {v.label}
                                    </span>
                                ))}
                                {BODY_VARIABLES.filter(v => bodyTemplate.includes(v.key)).length +
                                 PRODUCT_VARIABLES.filter(v => productBlock.includes(v.key)).length === 0 && (
                                    <span className="text-[10px] text-muted-foreground italic">لا توجد متغيرات</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
