"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Package, X } from "lucide-react"

interface Variant {
    id: string
    name: string
    price?: number | null
    imagePath?: string | null
}

interface VariantsListProps {
    variants: Variant[]
    basePrice: number
}

export function VariantsList({ variants, basePrice }: VariantsListProps) {
    if (!variants || variants.length === 0) return null

    return (
        <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50 shadow-inner">
            <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">الخيارات المتوفرة ({variants.length})</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {variants.map((variant) => {
                    const priceDiff = variant.price ? variant.price - basePrice : 0

                    return (
                        <div
                            key={variant.id}
                            className="group flex items-center gap-3 p-2 rounded-xl bg-background border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all text-sm"
                        >
                            {/* Variant Image */}
                            {variant.imagePath ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/50 cursor-zoom-in hover:ring-2 hover:ring-primary/30 transition-all">
                                            <Image
                                                src={variant.imagePath}
                                                alt={variant.name}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                        <div className="relative aspect-square w-full max-h-[80vh]">
                                            <Image
                                                src={variant.imagePath}
                                                alt={variant.name}
                                                fill
                                                className="object-contain"
                                                priority
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/50">
                                    <div className="flex items-center justify-center h-full w-full">
                                        <Package className="h-5 w-5 text-muted-foreground/40" />
                                    </div>
                                </div>
                            )}

                            {/* Details */}
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate" title={variant.name}>
                                    {variant.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs">
                                    {variant.price ? (
                                        <span className="font-mono font-semibold text-primary">
                                            {Number(variant.price).toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">نفس السعر</span>
                                    )}

                                    {priceDiff !== 0 && (
                                        <Badge variant={priceDiff > 0 ? "default" : "secondary"} className="text-[9px] px-1 py-0 h-4">
                                            {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(2)}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
