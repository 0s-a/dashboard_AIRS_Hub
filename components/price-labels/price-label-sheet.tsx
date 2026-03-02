"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { PriceLabelForm } from "./price-label-form"
import { PriceLabel } from "@prisma/client"

interface PriceLabelSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    priceLabel?: PriceLabel
}

export function PriceLabelSheet({ open, onOpenChange, priceLabel }: PriceLabelSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {priceLabel ? "تعديل التسعيرة" : "إضافة تسعيرة جديدة"}
                    </SheetTitle>
                    <SheetDescription>
                        {priceLabel
                            ? "قم بتحديث بيانات التسعيرة"
                            : "أضف مسمى تسعيرة جديد"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <PriceLabelForm
                        priceLabel={priceLabel}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
