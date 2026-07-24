"use client"

import Image from "next/image"
import { Package } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ItemImageCellProps {
    src: string | undefined
    alt: string
}

/**
 * Small item thumbnail for table cells.
 * Shows a placeholder icon when no image is available.
 * Clicking opens a zoom dialog with the full-size image.
 */
export function ItemImageCell({ src, alt }: ItemImageCellProps) {
    if (!src) {
        return (
            <div className="h-12 w-12 shrink-0 rounded-lg bg-muted/30 border border-dashed flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground/40" />
            </div>
        )
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted/20 cursor-zoom-in group transition-all hover:ring-2 hover:ring-primary/40 shadow-sm">
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                <DialogTitle className="sr-only">{alt}</DialogTitle>
                <div className="relative aspect-square w-full max-h-[80vh]">
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
