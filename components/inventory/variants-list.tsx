"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Package, Hash, Tag as TagIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Variant {
    id: string
    name: string
    variantNumber: string
    suffix: string
    price?: number | null
    hex?: string | null
    images?: Array<{ id: string; url: string }> | null
    imageCount?: number
}

interface VariantsListProps {
    variants: Variant[]
}

export function VariantsList({ variants }: VariantsListProps) {
    if (!variants || variants.length === 0) return null

    return (
        <div className="p-5 bg-muted/20 rounded-2xl space-y-5 border border-border/40 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-foreground">الخيارات المتوفرة</h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">إجمالي {variants.length} أنواع فرعية</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {variants.map((variant) => {
                    const mainImage = variant.images?.[0]?.url
                    
                    return (
                        <div
                            key={variant.id}
                            className="group flex flex-col gap-3 p-3 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Accent line for color variants */}
                            {variant.hex && (
                                <div 
                                    className="absolute top-0 right-0 left-0 h-1 opacity-60" 
                                    style={{ backgroundColor: variant.hex }}
                                />
                            )}

                            <div className="flex items-start gap-3">
                                {/* Variant Image */}
                                {mainImage ? (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-muted border border-border/50 cursor-zoom-in hover:ring-2 hover:ring-primary/30 transition-all shadow-sm">
                                                <Image
                                                    src={mainImage}
                                                    alt={variant.name}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                {variant.imageCount && variant.imageCount > 1 && (
                                                    <div className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-1 py-0.5 rounded-tl-md font-bold">
                                                        +{variant.imageCount - 1}
                                                    </div>
                                                )}
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                            <div className="relative aspect-square w-full max-h-[80vh]">
                                                <Image
                                                    src={mainImage}
                                                    alt={variant.name}
                                                    fill
                                                    className="object-contain"
                                                    priority
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-muted/50 border border-dashed border-border flex items-center justify-center">
                                        <Package className="h-6 w-6 text-muted-foreground/20" />
                                    </div>
                                )}

                                {/* Main Info */}
                                <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {variant.hex && (
                                            <div className="h-2 w-2 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: variant.hex }} />
                                        )}
                                        <span className="font-bold text-sm text-foreground truncate" title={variant.name}>
                                            {variant.name}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded-md w-fit">
                                        <Hash className="h-2.5 w-2.5 opacity-50" />
                                        {variant.variantNumber}
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-border/40" />

                            {/* Footer info: Price & Suffix */}
                            <div className="flex items-center justify-between gap-2 mt-auto">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/20">
                                    <TagIcon className="h-3 w-3" />
                                    <span>Suffix: {variant.suffix}</span>
                                </div>
                                
                                {variant.price ? (
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-mono font-bold text-sm text-primary">
                                            {Number(variant.price).toLocaleString('en-US')}
                                        </span>
                                        <span className="text-[9px] text-primary/70 font-bold uppercase">ر.ي</span>
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/20 font-medium text-muted-foreground border-border/50">
                                        سعر المنتج
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
