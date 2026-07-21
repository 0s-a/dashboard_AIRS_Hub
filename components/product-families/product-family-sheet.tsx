"use client"

import { Package } from "lucide-react"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { ProductFamilyForm } from "./product-family-form"
import type { ProductFamilyFormData } from "@/lib/types/product-family"

interface ProductFamilySheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    family?: ProductFamilyFormData
}

export function ProductFamilySheet({ open, onOpenChange, family }: ProductFamilySheetProps) {
    const isEditing = !!family

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <SheetTitle>
                                {isEditing ? "تعديل المنتج الرئيسي" : "إضافة منتج رئيسي"}
                            </SheetTitle>
                            <SheetDescription className="text-xs mt-0.5">
                                {isEditing
                                    ? `تعديل بيانات "${family.name}"`
                                    : "أضف منتجاً رئيسياً لتجميع الأصناف المرتبطة"
                                }
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="mt-6">
                    <ProductFamilyForm
                        family={family}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
