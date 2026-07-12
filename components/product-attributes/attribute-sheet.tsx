"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { AttributeForm } from "./attribute-form"
import { ProductAttribute } from "@prisma/client"

interface AttributeSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    attribute?: ProductAttribute
}

export function AttributeSheet({ open, onOpenChange, attribute }: AttributeSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {attribute ? "تعديل الصفة" : "إضافة صفة جديدة"}
                    </SheetTitle>
                    <SheetDescription>
                        {attribute
                            ? "قم بتحديث بيانات الصفة"
                            : "أضف صفة جديدة لكتالوج خصائص المنتجات"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <AttributeForm
                        attribute={attribute}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
