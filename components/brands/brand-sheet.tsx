"use client"

import { Bookmark } from "lucide-react"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { BrandForm } from "./brand-form"
import type { BrandFormData } from "@/lib/types/brand"

// ─── Props ─────────────────────────────────────────────────────

interface BrandSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** When provided, the sheet opens in edit mode */
    brand?: BrandFormData
}

// ─── Component ─────────────────────────────────────────────────

export function BrandSheet({ open, onOpenChange, brand }: BrandSheetProps) {
    const isEditing = !!brand

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">

                <SheetHeader>
                    <div className="flex items-center gap-2">
                        {/* Icon badge */}
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bookmark className="h-4 w-4 text-primary" />
                        </div>

                        {/* Title + description */}
                        <div>
                            <SheetTitle>
                                {isEditing ? "تعديل البراند" : "إضافة براند جديد"}
                            </SheetTitle>
                            <SheetDescription className="text-xs mt-0.5">
                                {isEditing
                                    ? `تعديل بيانات براند "${brand.name}"`
                                    : "أضف براند جديداً لربطه بالمنتجات"
                                }
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {/* Form */}
                <div className="mt-6">
                    <BrandForm
                        brand={brand}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>

            </SheetContent>
        </Sheet>
    )
}
