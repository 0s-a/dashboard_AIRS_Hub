"use client"

import { useState, useTransition } from "react"
import { Palette, Plus, X, Check, Pencil, Loader2, Hash, Package, ImageIcon, Link2, Unlink } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { addVariant, removeVariant, updateVariant, linkImagesToVariant, unlinkImagesFromVariant } from "@/lib/actions/variants"
import type { VariantRecord } from "@/lib/actions/variants"

// ─── Extended variant type with images ─────────────────────────────────────────

export type VariantWithImages = VariantRecord & {
    imageCount: number
    images: Array<{ id: string; url: string; filename: string; alt: string | null }>
}

export type ProductImageForLinking = {
    id: string
    url: string
    filename: string
    variantIds: string[]
}

// ─── Arabic preset colors ──────────────────────────────────────────────────────

const PRESET_COLORS: Array<{ label: string; hex: string }> = [
    { label: "أحمر",     hex: "#ef4444" },
    { label: "أزرق",     hex: "#3b82f6" },
    { label: "أخضر",     hex: "#22c55e" },
    { label: "أصفر",     hex: "#eab308" },
    { label: "أسود",     hex: "#171717" },
    { label: "أبيض",     hex: "#ffffff" },
    { label: "رمادي",    hex: "#6b7280" },
    { label: "بني",      hex: "#92400e" },
    { label: "برتقالي",  hex: "#f97316" },
    { label: "وردي",     hex: "#ec4899" },
    { label: "بنفسجي",   hex: "#a855f7" },
    { label: "سماوي",    hex: "#06b6d4" },
    { label: "ذهبي",     hex: "#d97706" },
    { label: "فضي",      hex: "#9ca3af" },
    { label: "كحلي",     hex: "#1e3a5f" },
    { label: "زيتي",     hex: "#65a30d" },
    { label: "نيلي",     hex: "#1d4ed8" },
]

// ─── Variant Form (Add / Edit) ─────────────────────────────────────────────────

interface VariantFormProps {
    productId: string
    itemNumber: string
    initial?: VariantRecord
    onSaved: (variant: VariantRecord) => void
    onCancel: () => void
}

function VariantForm({ productId, itemNumber, initial, onSaved, onCancel }: VariantFormProps) {
    const [name, setName] = useState(initial?.name || "")
    const [suffix, setSuffix] = useState(initial?.suffix || "")
    const [hex, setHex] = useState(initial?.hex || "")
    const [isPending, startTransition] = useTransition()

    const handleSave = () => {
        const trimmedName = name.trim()
        const trimmedSuffix = suffix.trim()
        if (!trimmedName) { toast.error("اسم المتغير مطلوب"); return }
        if (!trimmedSuffix) { toast.error("رمز المتغير (الخانة الرابعة) مطلوب"); return }

        startTransition(async () => {
            const data = {
                suffix: trimmedSuffix,
                name: trimmedName,
                type: "color",
                hex: hex.trim() || null,
            }

            let res
            if (initial) {
                res = await updateVariant(initial.id, data)
            } else {
                res = await addVariant(productId, data)
            }

            if (res.success && res.data) {
                toast.success(initial ? "تم تحديث المتغير" : "تم إضافة المتغير")
                onSaved(res.data)
            } else {
                toast.error(res.error || "فشل العملية")
            }
        })
    }

    const handlePresetClick = (preset: { label: string; hex: string }) => {
        setName(preset.label)
        setHex(preset.hex)
        if (!suffix) setSuffix(preset.label.replace(/[^a-zA-Z0-9]/g, ''))
    }

    return (
        <div className="space-y-4 p-4 border border-primary/20 rounded-xl bg-primary/5">
            {/* Variant Number Preview */}
            <div className="flex items-center gap-2 text-sm font-mono bg-muted/50 px-3 py-2 rounded-lg">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{itemNumber}-</span>
                <span className="text-primary font-bold">{suffix || "..."}</span>
            </div>

            {/* Suffix field (4th segment) */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">الخانة الرابعة (رمز فريد)</label>
                <Input
                    value={suffix}
                    onChange={e => setSuffix(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="مثال: 01, BLK, XL"
                    className="h-10 font-mono"
                    autoFocus
                />
                <p className="text-[10px] text-muted-foreground">أرقام أو حروف إنجليزية فقط</p>
            </div>

            {/* Name field */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">اسم المتغير</label>
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: أحمر، كبير، ..."
                    className="h-10"
                />
            </div>

            {/* Color hex */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">لون (اختياري)</label>
                <div className="flex items-center gap-2">
                    <Input
                        value={hex}
                        onChange={e => setHex(e.target.value)}
                        placeholder="#FF0000"
                        className="h-10 flex-1 font-mono"
                    />
                    {hex && (
                        <div
                            className="h-10 w-10 rounded-lg border-2 border-white shadow-sm ring-1 ring-black/10"
                            style={{ backgroundColor: hex }}
                        />
                    )}
                    {hex && (
                        <button onClick={() => setHex("")} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Preset Colors */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ألوان مُعرّفة</label>
                <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map(p => (
                        <button
                            key={p.label}
                            type="button"
                            onClick={() => handlePresetClick(p)}
                            className="group flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/50 bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-xs"
                        >
                            <div className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: p.hex }} />
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending} className="rounded-lg">
                    إلغاء
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isPending} className="rounded-lg bg-linear-to-r from-primary to-primary/80">
                    {isPending ? (
                        <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> جاري الحفظ...</>
                    ) : (
                        <><Check className="mr-2 h-3.5 w-3.5" /> {initial ? "تحديث" : "إضافة"}</>
                    )}
                </Button>
            </div>
        </div>
    )
}

// ─── Image Linking Dialog ──────────────────────────────────────────────────────

interface ImageLinkDialogProps {
    variantId: string
    variantName: string
    linkedImageIds: string[]
    allProductImages: ProductImageForLinking[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onLinked: () => void
}

function ImageLinkDialog({
    variantId,
    variantName,
    linkedImageIds,
    allProductImages,
    open,
    onOpenChange,
    onLinked,
}: ImageLinkDialogProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set(linkedImageIds))
    const [isPending, startTransition] = useTransition()

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSave = () => {
        startTransition(async () => {
            // Unlink images that were removed
            const toUnlink = linkedImageIds.filter(id => !selected.has(id))
            if (toUnlink.length > 0) {
                await unlinkImagesFromVariant(variantId, toUnlink)
            }

            // Link images that were added
            const toLink = [...selected].filter(id => !linkedImageIds.includes(id))
            if (toLink.length > 0) {
                await linkImagesToVariant(variantId, toLink)
            }

            toast.success("تم تحديث صور المتغير")
            onLinked()
            onOpenChange(false)
        })
    }

    // Only show images that are unlinked to this variant, or unlinked to anything (or just show all)
    // Actually for many-to-many, we can just show ALL product images so user can check which ones apply to THIS variant.
    const availableImages = allProductImages;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        ربط صور بـ &quot;{variantName}&quot;
                    </DialogTitle>
                </DialogHeader>

                {availableImages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">لا توجد صور متاحة للربط</p>
                        <p className="text-xs">أضف صور للمنتج أولاً</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                            {availableImages.map(img => {
                                const isSelected = selected.has(img.id)
                                return (
                                    <button
                                        key={img.id}
                                        onClick={() => toggle(img.id)}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                            isSelected
                                                ? "border-primary ring-2 ring-primary/30"
                                                : "border-border/50 hover:border-primary/30"
                                        }`}
                                    >
                                        <Image
                                            src={img.url}
                                            alt={img.filename}
                                            fill
                                            className="object-cover"
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <Check className="h-6 w-6 text-white drop-shadow-md" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-muted-foreground">{selected.size} صور مختارة</p>
                            <Button size="sm" onClick={handleSave} disabled={isPending} className="rounded-lg">
                                {isPending ? (
                                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> جاري الحفظ...</>
                                ) : (
                                    <><Check className="mr-2 h-3.5 w-3.5" /> حفظ</>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

// ─── Variant Card ──────────────────────────────────────────────────────────────

interface VariantCardProps {
    variant: VariantWithImages
    onEdit: () => void
    onDelete: () => void
    onLinkImages: () => void
    isDeleting: boolean
}

function VariantCard({ variant, onEdit, onDelete, onLinkImages, isDeleting }: VariantCardProps) {
    return (
        <div className={`group flex flex-col gap-2 p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-3">
                {/* Color swatch or icon */}
                {variant.hex ? (
                    <div
                        className="h-10 w-10 shrink-0 rounded-lg border-2 border-white shadow-sm ring-1 ring-black/10"
                        style={{ backgroundColor: variant.hex }}
                    />
                ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{variant.name}</span>
                        {variant.isDefault && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">افتراضي</Badge>
                        )}
                        {variant.imageCount > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                <ImageIcon className="h-2.5 w-2.5" />
                                {variant.imageCount}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate">{variant.variantNumber}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onLinkImages} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="ربط صور">
                        <Link2 className="h-3.5 w-3.5 text-blue-500" />
                    </button>
                    <button onClick={onEdit} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={onDelete} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors">
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                    </button>
                </div>
            </div>

            {/* Linked Images */}
            {variant.images.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pl-13">
                    {variant.images.map(img => (
                        <div key={img.id} className="relative h-10 w-10 rounded-md overflow-hidden border border-border/50">
                            <Image src={img.url} alt={img.alt || img.filename} fill className="object-cover" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main VariantManagement Component ─────────────────────────────────────────

interface VariantManagementProps {
    productId: string
    itemNumber: string
    variants: VariantWithImages[]
    productImages?: ProductImageForLinking[]
}

export function VariantManagement({ productId, itemNumber, variants: initialVariants, productImages = [] }: VariantManagementProps) {
    const [variants, setVariants] = useState<VariantWithImages[]>(initialVariants)
    const [showForm, setShowForm] = useState(false)
    const [editingVariant, setEditingVariant] = useState<VariantRecord | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [linkingVariant, setLinkingVariant] = useState<VariantWithImages | null>(null)
    const router = useRouter()

    const handleAdded = (newVariant: VariantRecord) => {
        setVariants(prev => [...prev, { ...newVariant, imageCount: 0, images: [] }])
        setShowForm(false)
    }

    const handleUpdated = (updatedVariant: VariantRecord) => {
        setVariants(prev => prev.map(v => v.id === updatedVariant.id
            ? { ...updatedVariant, imageCount: v.imageCount, images: v.images }
            : v
        ))
        setEditingVariant(null)
    }

    const handleDelete = async (variantId: string) => {
        setDeletingId(variantId)
        try {
            const res = await removeVariant(variantId)
            if (res.success) {
                setVariants(prev => prev.filter(v => v.id !== variantId))
                toast.success("تم حذف المتغير")
                router.refresh()
            } else {
                toast.error(res.error || "فشل الحذف")
            }
        } catch {
            toast.error("خطأ غير متوقع")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">المتغيرات</h3>
                    <p className="text-xs text-muted-foreground">{variants.length} {variants.length === 1 ? "متغير" : "متغيرات"}</p>
                </div>
                {!showForm && !editingVariant && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForm(true)}
                        className="h-8 rounded-lg gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        إضافة متغير
                    </Button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <VariantForm
                    productId={productId}
                    itemNumber={itemNumber}
                    onSaved={handleAdded}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {editingVariant && (
                <VariantForm
                    productId={productId}
                    itemNumber={itemNumber}
                    initial={editingVariant}
                    onSaved={handleUpdated}
                    onCancel={() => setEditingVariant(null)}
                />
            )}

            {/* List */}
            {variants.length > 0 ? (
                <div className="space-y-2">
                    {variants.map(v => (
                        <VariantCard
                            key={v.id}
                            variant={v}
                            onEdit={() => setEditingVariant(v)}
                            onDelete={() => handleDelete(v.id)}
                            onLinkImages={() => setLinkingVariant(v)}
                            isDeleting={deletingId === v.id}
                        />
                    ))}
                </div>
            ) : !showForm && (
                <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد متغيرات بعد</p>
                    <p className="text-xs">أضف ألوان أو أحجام أو أي متغيرات أخرى</p>
                </div>
            )}

            {/* Image Link Dialog */}
            {linkingVariant && (
                <ImageLinkDialog
                    variantId={linkingVariant.id}
                    variantName={linkingVariant.name}
                    linkedImageIds={linkingVariant.images.map(i => i.id)}
                    allProductImages={productImages}
                    open={!!linkingVariant}
                    onOpenChange={open => !open && setLinkingVariant(null)}
                    onLinked={() => router.refresh()}
                />
            )}
        </div>
    )
}
