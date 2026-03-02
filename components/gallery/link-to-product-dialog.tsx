"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Link2, Link2Off, Search, Package, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { linkImageToProduct, unlinkImageFromProduct } from "@/lib/actions/gallery"
import { getProducts } from "@/lib/actions/inventory"
import type { GalleryImageData } from "@/lib/actions/gallery"

interface LinkToProductDialogProps {
    image: GalleryImageData
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

type Product = { id: string; name: string; itemNumber: string; mediaImages: any }

export function LinkToProductDialog({ image, open, onOpenChange, onSuccess }: LinkToProductDialogProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [filtered, setFiltered] = useState<Product[]>([])
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Product | null>(null)
    const [loading, setLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setLoading(true)
        getProducts().then(res => {
            const list = res.data || []
            setProducts(list)
            setFiltered(list)
            // Pre-select current product if linked
            if (image.productId) {
                const current = list.find((p: any) => p.id === image.productId)
                setSelected(current || null)
            } else {
                setSelected(null)
            }
            setLoading(false)
        })
    }, [open, image.productId])

    useEffect(() => {
        if (!search.trim()) {
            setFiltered(products)
        } else {
            const q = search.toLowerCase()
            setFiltered(products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.itemNumber.toLowerCase().includes(q)
            ))
        }
    }, [search, products])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            let res
            if (selected) {
                res = await linkImageToProduct(image.id, selected.id)
            } else {
                res = await unlinkImageFromProduct(image.id)
            }
            if (res.success) {
                toast.success(selected ? 'تم ربط الصورة بالمنتج' : 'تم إلغاء الربط')
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error('فشل العملية', { description: res.error })
            }
        } finally {
            setIsSaving(false)
        }
    }

    const getPrimaryImageUrl = (mediaImages: any): string | null => {
        const imgs = mediaImages as Array<{ url: string; isPrimary: boolean }> | null
        return imgs?.find(i => i.isPrimary)?.url ?? imgs?.[0]?.url ?? null
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg glass-panel" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Link2 className="h-5 w-5 text-primary" />
                        ربط الصورة بمنتج
                    </DialogTitle>
                </DialogHeader>

                {/* Image preview */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden">
                        <Image src={image.url} alt={image.alt || ""} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{image.filename}</p>
                        {image.product && (
                            <Badge variant="outline" className="mt-1 text-xs text-primary border-primary/30">
                                مرتبط بـ: {image.product.name}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ابحث عن منتج..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pr-9"
                    />
                </div>

                {/* Product list */}
                <div className="max-h-64 overflow-y-auto space-y-1 border rounded-xl p-2 bg-muted/10">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-6">لا توجد نتائج</p>
                    ) : (
                        filtered.map(product => {
                            const imgSrc = getPrimaryImageUrl(product.mediaImages)
                            const isSelected = selected?.id === product.id
                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => setSelected(isSelected ? null : product)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-right ${isSelected
                                        ? 'bg-primary/10 border border-primary/30'
                                        : 'hover:bg-muted/50 border border-transparent'
                                        }`}
                                >
                                    <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted">
                                        {imgSrc ? (
                                            <Image src={imgSrc} alt={product.name} fill className="object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Package className="h-4 w-4 text-muted-foreground/50" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{product.itemNumber}</p>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </button>
                            )
                        })
                    )}
                </div>

                <DialogFooter className="gap-2 flex-row-reverse sm:flex-row">
                    {image.productId && (
                        <Button
                            variant="outline"
                            onClick={() => { setSelected(null); handleSave() }}
                            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
                            disabled={isSaving}
                        >
                            <Link2Off className="h-4 w-4" />
                            إلغاء الربط
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving || (!selected && !image.productId)} className="flex-1 gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                        {selected ? `ربط بـ "${selected.name}"` : 'حفظ'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
