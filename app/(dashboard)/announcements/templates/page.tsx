"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    FileText, ImageIcon, Plus, Trash2, Pencil,
    Sparkles, Loader2, Star, ArrowRight, Package,
    Layers, Search, X, MessageSquare, CheckCircle2,
    Clock, LayoutGrid, List,
} from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Badge }    from "@/components/ui/badge"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { cn }       from "@/lib/utils"
import { toast }    from "sonner"
import {
    getMessageTemplates,
    deleteMessageTemplate,
    updateMessageTemplate,
    createMessageTemplate,
    seedDefaultTemplates,
} from "@/lib/actions/message-templates"
import { TemplateEditor } from "@/components/announcements/template-editor"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateRow {
    id:           string
    name:         string
    type:         string
    sendMode:     string
    bodyTemplate: string
    productBlock: string
    separator:    string
    isDefault:    boolean
    createdAt:    Date | string
    _count?:      { announcements: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("ar", { day: "numeric", month: "short", year: "numeric" })
}

function templatePreview(t: TemplateRow) {
    return t.bodyTemplate.replace(/\{\{.*?\}\}/g, "…").replace(/\n+/g, " ").trim().substring(0, 90)
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
    t, isActive, viewMode,
    onEdit, onDelete, onSetDefault,
}: {
    t: TemplateRow; isActive: boolean; viewMode: "grid" | "list"
    onEdit: () => void; onDelete: () => void; onSetDefault: () => void
}) {
    const TypeIcon  = t.type === "text_image" ? ImageIcon : FileText
    const usageCount = t._count?.announcements ?? 0

    if (viewMode === "list") return (
        <div className={cn(
            "group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-200",
            isActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border/50 bg-card/50 hover:border-primary/20 hover:bg-card hover:shadow-sm"
        )}>
            {/* Icon */}
            <div className={cn(
                "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                isActive ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
                <TypeIcon className="size-4.5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{t.name}</span>
                    {t.isDefault && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5">
                            <Star className="size-2.5" fill="currentColor" /> افتراضي
                        </span>
                    )}
                    <span className={cn(
                        "text-[10px] font-bold rounded-full px-2 py-0.5",
                        t.type === "text_image" ? "bg-indigo-500/10 text-indigo-600" : "bg-muted/60 text-muted-foreground"
                    )}>
                        {t.type === "text_image" ? "نص + صور" : "نص فقط"}
                    </span>
                    {t.sendMode === "per_product" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-violet-500/10 text-violet-600 rounded-full px-2 py-0.5">
                            <Layers className="size-2.5" /> رسالة لكل منتج
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{templatePreview(t)}</p>
            </div>

            {/* Meta */}
            <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
                <span className="flex items-center gap-1"><Package className="size-3" /> {usageCount} إعلان</span>
                <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDate(t.createdAt)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!t.isDefault && (
                    <button type="button" title="تعيين كافتراضي" onClick={onSetDefault}
                        className="size-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors">
                        <Star className="size-3.5" />
                    </button>
                )}
                <button type="button" title="تعديل" onClick={onEdit}
                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                    <Pencil className="size-3.5" />
                </button>
                <button type="button" title="حذف" onClick={onDelete}
                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 className="size-3.5" />
                </button>
            </div>
        </div>
    )

    // Grid card
    return (
        <div className={cn(
            "group relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200",
            isActive
                ? "border-primary/40 bg-primary/5 shadow-md"
                : "border-border/50 bg-card/50 hover:border-primary/20 hover:bg-card hover:shadow-md hover:-translate-y-0.5"
        )}>
            {/* Active indicator */}
            {isActive && (
                <div className="absolute top-3 right-3">
                    <CheckCircle2 className="size-4 text-primary" />
                </div>
            )}

            {/* Top */}
            <div className="flex items-start gap-3">
                <div className={cn(
                    "size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isActive ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                    <TypeIcon className="size-5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-bold text-sm leading-tight">{t.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.isDefault && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5">
                                <Star className="size-2.5" fill="currentColor" /> افتراضي
                            </span>
                        )}
                        <span className={cn(
                            "text-[10px] font-bold rounded-full px-2 py-0.5",
                            t.type === "text_image" ? "bg-indigo-500/10 text-indigo-600" : "bg-muted/60 text-muted-foreground"
                        )}>
                            {t.type === "text_image" ? "نص + صور" : "نص فقط"}
                        </span>
                        {t.sendMode === "per_product" && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-violet-500/10 text-violet-600 rounded-full px-2 py-0.5">
                                <Layers className="size-2.5" /> لكل منتج
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview text */}
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 border-t border-border/20 pt-3">
                {templatePreview(t)}…
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Package className="size-3" /> {usageCount}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDate(t.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!t.isDefault && (
                        <button type="button" title="تعيين كافتراضي" onClick={onSetDefault}
                            className="size-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors">
                            <Star className="size-3.5" />
                        </button>
                    )}
                    <button type="button" title="تعديل" onClick={onEdit}
                        className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                        <Pencil className="size-3.5" />
                    </button>
                    <button type="button" title="حذف" onClick={onDelete}
                        className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
    const router = useRouter()

    const [templates,  setTemplates]  = useState<TemplateRow[]>([])
    const [loading,    setLoading]    = useState(true)
    const [editId,     setEditId]     = useState<string | null>(null)
    const [creating,   setCreating]   = useState(false)
    const [saving,     setSaving]     = useState(false)
    const [search,     setSearch]     = useState("")
    const [viewMode,   setViewMode]   = useState<"grid" | "list">("grid")

    // Editor state
    const [editName,         setEditName]         = useState("")
    const [editType,         setEditType]         = useState<"text" | "text_image">("text")
    const [editSendMode,     setEditSendMode]     = useState<"combined" | "per_product">("combined")
    const [editBodyTemplate, setEditBodyTemplate] = useState("")
    const [editProductBlock, setEditProductBlock] = useState("")
    const [editSeparator,    setEditSeparator]    = useState("\n---\n")

    // ── Load ──────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true)
        await seedDefaultTemplates()
        const res = await getMessageTemplates()
        if (res.success && res.data) setTemplates(res.data as TemplateRow[])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return q ? templates.filter(t => t.name.toLowerCase().includes(q)) : templates
    }, [templates, search])

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total:      templates.length,
        withImages: templates.filter(t => t.type === "text_image").length,
        perProduct: templates.filter(t => t.sendMode === "per_product").length,
        inUse:      templates.filter(t => (t._count?.announcements ?? 0) > 0).length,
    }), [templates])

    // ── Open / Close editor ───────────────────────────────────────────────────
    const openEdit = (t: TemplateRow) => {
        setEditId(t.id)
        setCreating(false)
        setEditName(t.name)
        setEditType(t.type as "text" | "text_image")
        setEditSendMode((t.sendMode ?? "combined") as "combined" | "per_product")
        setEditBodyTemplate(t.bodyTemplate)
        setEditProductBlock(t.productBlock)
        setEditSeparator(t.separator)
        // Scroll editor into view on mobile
        setTimeout(() => document.getElementById("editor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    }

    const openCreate = () => {
        setEditId(null)
        setCreating(true)
        setEditName("")
        setEditType("text")
        setEditSendMode("combined")
        setEditBodyTemplate("")
        setEditProductBlock("")
        setEditSeparator("\n---\n")
        setTimeout(() => document.getElementById("editor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    }

    const closeEditor = () => { setEditId(null); setCreating(false) }

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!editName.trim()) { toast.error("اسم القالب مطلوب"); return }
        setSaving(true)
        try {
            const payload = {
                name: editName.trim(), type: editType, sendMode: editSendMode,
                bodyTemplate: editBodyTemplate, productBlock: editProductBlock, separator: editSeparator,
            }
            if (creating) {
                const res = await createMessageTemplate(payload)
                if (res.success) { toast.success("تم إنشاء القالب ✓"); closeEditor() }
                else toast.error((res as any).error)
            } else if (editId) {
                const res = await updateMessageTemplate(editId, payload)
                if (res.success) { toast.success("تم حفظ التعديلات ✓") }
                else toast.error((res as any).error)
            }
            await load()
        } finally {
            setSaving(false)
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (t: TemplateRow) => {
        if (!confirm(`حذف القالب "${t.name}"؟`)) return
        const res = await deleteMessageTemplate(t.id)
        if (res.success) {
            toast.success("تم الحذف")
            if (editId === t.id) closeEditor()
            await load()
        } else {
            toast.error((res as any).error)
        }
    }

    // ── Set default ───────────────────────────────────────────────────────────
    const handleSetDefault = async (t: TemplateRow) => {
        const res = await updateMessageTemplate(t.id, { isDefault: true })
        if (res.success) { toast.success("تم تعيين القالب الافتراضي"); await load() }
        else toast.error((res as any).error)
    }

    const editingTemplate = editId ? templates.find(t => t.id === editId) : null
    const isEditorOpen    = creating || !!editId

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/announcements")}
                        className="size-9 rounded-xl shrink-0">
                        <ArrowRight className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="size-5 text-amber-500" />
                            قوالب الرسائل
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            إنشاء وإدارة قوالب رسائل الإعلانات
                        </p>
                    </div>
                </div>
                <Button onClick={openCreate}
                    className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20 h-10">
                    <Plus className="size-4" />
                    قالب جديد
                </Button>
            </div>

            {/* ── Stats Bar ── */}
            {!loading && templates.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "إجمالي القوالب",    value: stats.total,      icon: MessageSquare, color: "text-primary",    bg: "bg-primary/8"    },
                        { label: "قوالب بصور",        value: stats.withImages, icon: ImageIcon,     color: "text-indigo-600", bg: "bg-indigo-500/8" },
                        { label: "إرسال لكل منتج",   value: stats.perProduct, icon: Layers,        color: "text-violet-600", bg: "bg-violet-500/8" },
                        { label: "مستخدمة في إعلان", value: stats.inUse,      icon: Package,       color: "text-emerald-600",bg: "bg-emerald-500/8"},
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className={cn("rounded-2xl border border-border/40 p-4 flex items-center gap-3", bg)}>
                            <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", bg)}>
                                <Icon className={cn("size-4", color)} />
                            </div>
                            <div>
                                <p className={cn("text-xl font-bold leading-none", color)}>{value}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Main Layout ── */}
            <div className={cn(
                "grid gap-6",
                isEditorOpen ? "grid-cols-1 lg:grid-cols-[1fr_420px]" : "grid-cols-1"
            )}>

                {/* ── Left: Templates List ── */}
                <div className="space-y-4 min-w-0">

                    {/* Toolbar */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="بحث عن قالب..."
                                className="h-9 rounded-xl pr-9 text-sm"
                            />
                            {search && (
                                <button type="button" onClick={() => setSearch("")}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Results count */}
                        {search && (
                            <span className="text-xs text-muted-foreground shrink-0">
                                {filtered.length} نتيجة
                            </span>
                        )}

                        {/* View toggle */}
                        <div className="flex rounded-xl border border-border/60 overflow-hidden bg-muted/20 h-9 shrink-0">
                            {([
                                { id: "grid" as const, icon: LayoutGrid },
                                { id: "list" as const, icon: List },
                            ]).map(({ id, icon: Icon }) => (
                                <button key={id} type="button" onClick={() => setViewMode(id)}
                                    className={cn(
                                        "px-3 flex items-center justify-center transition-all border-l border-border/30 first:border-0",
                                        viewMode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                    )}>
                                    <Icon className="size-3.5" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="size-6 animate-spin" />
                        </div>
                    )}

                    {/* Empty search result */}
                    {!loading && filtered.length === 0 && templates.length > 0 && (
                        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50 text-center gap-3">
                            <Search className="size-8 text-muted-foreground/30" />
                            <div>
                                <p className="font-bold text-sm">لا توجد نتائج</p>
                                <p className="text-xs text-muted-foreground mt-1">جرّب كلمة بحث أخرى</p>
                            </div>
                            <button type="button" onClick={() => setSearch("")}
                                className="text-xs text-primary hover:underline font-semibold">
                                مسح البحث
                            </button>
                        </div>
                    )}

                    {/* Truly empty */}
                    {!loading && templates.length === 0 && (
                        <div
                            onClick={openCreate}
                            className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border/50 text-center gap-4 cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-all duration-300 group">
                            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Plus className="size-7 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">لا توجد قوالب بعد</p>
                                <p className="text-xs text-muted-foreground mt-1">اضغط لإنشاء أول قالب</p>
                            </div>
                        </div>
                    )}

                    {/* Grid view */}
                    {!loading && filtered.length > 0 && viewMode === "grid" && (
                        <div className={cn(
                            "grid gap-4",
                            isEditorOpen ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                        )}>
                            {filtered.map(t => (
                                <TemplateCard key={t.id} t={t} viewMode="grid"
                                    isActive={editId === t.id}
                                    onEdit={() => openEdit(t)}
                                    onDelete={() => handleDelete(t)}
                                    onSetDefault={() => handleSetDefault(t)}
                                />
                            ))}
                        </div>
                    )}

                    {/* List view */}
                    {!loading && filtered.length > 0 && viewMode === "list" && (
                        <div className="space-y-2">
                            {filtered.map(t => (
                                <TemplateCard key={t.id} t={t} viewMode="list"
                                    isActive={editId === t.id}
                                    onEdit={() => openEdit(t)}
                                    onDelete={() => handleDelete(t)}
                                    onSetDefault={() => handleSetDefault(t)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: Editor Panel ── */}
                {isEditorOpen && (
                    <div id="editor-panel" className="min-w-0">
                        <div className="sticky top-6 rounded-2xl border border-primary/25 bg-card shadow-xl shadow-primary/5 overflow-hidden">

                            {/* Editor Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-primary/3">
                                <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-lg bg-primary/15 flex items-center justify-center">
                                        {creating
                                            ? <Plus className="size-3.5 text-primary" />
                                            : <Pencil className="size-3.5 text-primary" />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-primary leading-none">
                                            {creating ? "قالب جديد" : "تعديل القالب"}
                                        </p>
                                        {!creating && editingTemplate && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{editingTemplate.name}</p>
                                        )}
                                    </div>
                                </div>
                                <button type="button" onClick={closeEditor}
                                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                    <X className="size-3.5" />
                                </button>
                            </div>

                            {/* Editor Body */}
                            <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {/* Template name */}
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-semibold">اسم القالب</Label>
                                    <Input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="h-10 rounded-xl"
                                        placeholder="مثال: عرض منتجات مع صور"
                                    />
                                </div>

                                {/* Editor */}
                                <TemplateEditor
                                    type={editType}
                                    sendMode={editSendMode}
                                    bodyTemplate={editBodyTemplate}
                                    productBlock={editProductBlock}
                                    separator={editSeparator}
                                    onTypeChange={setEditType}
                                    onSendModeChange={setEditSendMode}
                                    onBodyTemplateChange={setEditBodyTemplate}
                                    onProductBlockChange={setEditProductBlock}
                                    onSeparatorChange={setEditSeparator}
                                />

                                {/* Save */}
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !editName.trim()}
                                    className="w-full h-11 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                                    {saving
                                        ? <Loader2 className="size-4 animate-spin" />
                                        : <Sparkles className="size-4" />
                                    }
                                    {creating ? "إنشاء القالب" : "حفظ التعديلات"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Placeholder when editor is closed */}
                {!isEditorOpen && !loading && templates.length > 0 && (
                    <div className="hidden lg:flex" />
                )}
            </div>
        </div>
    )
}
