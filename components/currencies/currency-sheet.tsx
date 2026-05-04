"use client"

import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { CurrencyForm } from "./currency-form"
import type { SerializedCurrency } from "@/app/(dashboard)/currencies/page"

interface CurrencySheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currency?: SerializedCurrency
    /** Symbol of the base/default currency — shown in exchange rate hint */
    baseCurrencySymbol?: string
}

export function CurrencySheet({ open, onOpenChange, currency, baseCurrencySymbol }: CurrencySheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{currency ? "تعديل العملة" : "إضافة عملة جديدة"}</SheetTitle>
                    <SheetDescription>
                        {currency ? "قم بتحديث بيانات العملة وسعر صرفها" : "أضف عملة جديدة مع تحديد سعر الصرف مقابل العملة الرئيسية"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <CurrencyForm
                        currency={currency}
                        onSuccess={() => onOpenChange(false)}
                        baseCurrencySymbol={baseCurrencySymbol}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
