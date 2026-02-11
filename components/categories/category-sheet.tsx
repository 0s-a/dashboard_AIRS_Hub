"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { CategoryForm } from "./category-form"
import { Category } from "@prisma/client"

interface CategorySheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: Category
}

export function CategorySheet({ open, onOpenChange, category }: CategorySheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {category ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
                    </SheetTitle>
                    <SheetDescription>
                        {category
                            ? "قم بتحديث بيانات التصنيف"
                            : "أضف تصنيفاً جديداً للمنتجات"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <CategoryForm
                        category={category}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
