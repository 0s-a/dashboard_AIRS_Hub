"use client"

import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { CurrencyForm } from "./currency-form"
import { Currency } from "@prisma/client"

interface CurrencySheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currency?: Currency
}

export function CurrencySheet({ open, onOpenChange, currency }: CurrencySheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{currency ? "تعديل العملة" : "إضافة عملة جديدة"}</SheetTitle>
                    <SheetDescription>
                        {currency ? "قم بتحديث بيانات العملة" : "أضف عملة جديدة لاستخدامها في التسعير"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <CurrencyForm currency={currency} onSuccess={() => onOpenChange(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
