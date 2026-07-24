"use client"

import { Package } from "lucide-react"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { ProductForm } from "./product-form"
import type { ProductFormData } from "@/lib/types/product"

interface ProductSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product?: ProductFormData
}

export function ProductSheet({ open, onOpenChange, product }: ProductSheetProps) {
    const isEditing = !!product

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
                                {isEditing ? "تعديل المنتج" : "إضافة منتج"}
                            </SheetTitle>
                            <SheetDescription className="text-xs mt-0.5">
                                {isEditing
                                    ? `تعديل بيانات "${product.name}"`
                                    : "أضف منتجاً لتجميع الأصناف المرتبطة"
                                }
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="mt-6">
                    <ProductForm
                        product={product}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
