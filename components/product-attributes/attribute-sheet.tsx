"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ProductAttributeForm } from "./attribute-form"
import type { SerializedItemAttributeCatalog } from "@/lib/types/item-attribute"

interface AttributeSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    attribute?: SerializedItemAttributeCatalog
}

export function AttributeSheet({ open, onOpenChange, attribute }: AttributeSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{attribute ? "تعديل الصفة" : "إضافة صفة جديدة"}</SheetTitle>
                    <SheetDescription>
                        {attribute ? "قم بتحديث بيانات الصفة" : "أضف صفة جديدة لكتالوج الأصناف"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <ProductAttributeForm attribute={attribute} onSuccess={() => onOpenChange(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
