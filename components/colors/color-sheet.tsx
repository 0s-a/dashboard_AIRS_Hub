"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ColorForm } from "./color-form"
import { Color } from "@prisma/client"

interface ColorSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    color?: Color
}

export function ColorSheet({ open, onOpenChange, color }: ColorSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{color ? "تعديل اللون" : "إضافة لون جديد"}</SheetTitle>
                    <SheetDescription>
                        {color ? "قم بتحديث بيانات اللون" : "أضف لوناً جديداً للكتalog"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <ColorForm color={color} onSuccess={() => onOpenChange(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
